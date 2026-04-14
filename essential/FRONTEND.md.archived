# HyperQuote — Complete Frontend Specification

**Created:** 2026-03-29
**Last updated:** 2026-03-29
**Scope:** All 5 applications — Website, Portal, Internal Platform, CEO Command Center, Driver App
**Source of truth:** `essential/RESEARCH.md` + `essential/brand/UI-VISION.md` + `essential/brand/STACK-DECISION.md`
**UX research sources:** `RESEARCH-B2B-Portal-UX-Patterns.md`, `RESEARCH-UX-Patterns-Dispatch-Fleet-Warehouse.md`, `RESEARCH-Finance-Sales-UX-Patterns.md`

---

## PART 1: REFERENCE (read once, apply everywhere)

## SHARED DESIGN SYSTEM

This section defines the unified design tokens, patterns, and behaviors shared across all 5 apps. Per-app overrides are noted inline.

### DS.1 Color System

**Three colors. Period.**

| Token | Value | Role |
|-------|-------|------|
| `--color-base` | `#FFFFFF` (light) / `#09090B` (dark) | Background, space, canvas |
| `--color-text` | `#0F172A` (light) / `#FFFFFF` (dark) | Primary text, headings |
| `--color-primary` | `#2563EB` | Brand accent, interactive elements, links, CTAs |

Dark mode is literal inversion of White and Black. User-controlled toggle. System preference respected on first load.

**Semantic status colors (data only, not design):**

| Token | Value | Usage |
|-------|-------|-------|
| `--color-success` | Green | Confirmed, delivered, cleared, healthy, on-time |
| `--color-warning` | Yellow/Amber | Expiring, aging (1-30 days), idle, low stock |
| `--color-error` | Red | Failed, overdue, bounced, stopped, problem |
| `--color-info` | Blue-gray | Informational, in-transit, quoting |

**CEO app exception:** Zero accent colors. No blue for interactive elements. Emphasis through typography weight and contrast only. Semantic status colors remain for data.

**Derived tokens (generated from three colors):**

| Token | Purpose |
|-------|---------|
| `--color-text-muted` | Secondary text (70% opacity) |
| `--color-text-subtle` | Tertiary text (50% opacity) |
| `--color-border` | Dividers, table borders (15% opacity) |
| `--color-surface` | Slightly elevated bg (light: `#F8FAFC`, dark: `#18181B`) |
| `--color-base-alt` | Footer, alternate sections (light: `#EFF6FF`, dark: `#18181B`) |
| `--color-card` | Card/panel bg (light: `#FFFFFF`, dark: `#1C1C1E`) |

**AR aging severity colors (Finance module + CEO):**

| Bucket | Color | Token |
|--------|-------|-------|
| Current | Green/Neutral | `--color-success` |
| 1-30 days | Yellow | `--color-yellow-400` |
| 31-60 days | Orange | `--color-orange-500` |
| 61-90 days | Red | `--color-red-400` |
| 90+ days | Dark Red (bold/badge) | `--color-red-600` |

Same colors apply across all AR views (portal, internal, CEO) for consistency.

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
| Spring | Entering — windows emerge, items appear, things grow | Motion v12 |
| Tween | Exiting — windows dismiss, items fade, things shrink | Motion v12 |
| CSS transition | Popovers, menus, hover states, scroll-triggered blur | Native CSS |

**Three speeds only:**

| Speed | Duration | Usage |
|-------|----------|-------|
| Fast | 100-150ms | Micro-interactions — button press, hover, toggle |
| Medium | 200-300ms | State changes — tab switch, panel expand, status update |
| Slow | 400-600ms | Layout transitions — window open/close, page crossfade |

**Rules:**
- Colors change instantly — never animate color transitions
- Zero decorative animation. Every animation communicates something.
- 60fps minimum. Spring physics for all entering elements.

### DS.6 Glass Window System

Two tiers only:

**Window tier (primary panels):**
- `backdrop-filter: blur(16px)` (`backdrop-blur-xl`)
- `background: rgba(255,255,255,0.80)` / `dark: rgba(0,0,0,0.80)`
- Subtle shadow, brand-token-driven rounded corners
- Spring animation on open (Motion v12), tween on close
- Desktop: ~90% viewport width/height. Mobile: 100%.

**Elevated tier (modals, command palette, confirmations):**
- `backdrop-filter: blur(24px)` (`backdrop-blur-2xl`)
- `background: rgba(255,255,255,0.90)` / `dark: rgba(0,0,0,0.90)`
- Deeper shadow, dimming effect on content behind
- Floats above window tier

**Glass panel container (for charts/data in glass):**
- `backdrop-filter: blur(12px)`
- `background: rgba(255,255,255,0.08)`
- `border: 1px solid rgba(255,255,255,0.12)`
- `border-radius: 16px`
- `padding: 24px`
- Hover: background brightens to `0.12`. Focus: `box-shadow` with accent color at 20% opacity.

**Charts in glass:** Use sparklines, area charts with gradient, single-color bar charts, donut charts, thin line charts (2-3 lines max), progress bars. Avoid pie charts, stacked bars, scatter plots, 3D. Gridlines at `rgba(255,255,255,0.06)`. Axis labels at `rgba(255,255,255,0.5)`.

### DS.7 Loading, Empty, and Error States

**Loading:** Skeleton shimmer loaders matching expected content shape. Content-shaped gray blocks that animate. No spinners. No "Loading..." text.

**Empty states:** Meaningful message + contextual CTA button. Lion watermark may appear at barely-perceptible opacity. Examples:
- Orders empty: "No orders yet. Ready to build?" + "Get a Quote" button
- Search no results: "No matches for '{query}'. Try different terms." + "Clear filters" link

**Error states:**
- Failed data fetch: inline error message + "Retry" button
- Failed action: toast notification (subtle for success, noticeable for error)
- Network offline: 32px banner at top of viewport, `var(--color-warning-bg)`, auto-dismisses on reconnect. Mutations disabled.
- Permission denied: redirect (unauthorized elements hidden, not disabled)

**Toast notifications:** Position: top area, stacked. Success = subtle. Error = noticeable. Never used for form validation (use inline field-level errors instead). Auto-dismiss: 5s for success, persistent for errors with dismiss button.

### DS.8 Confirmation & Undo Patterns

**Undo pattern (reversible actions):** Execute immediately. Show toast with `[Undo]` link (8-10 second timeout). No confirmation dialog. Examples: removing an item from cart, archiving a conversation, marking a notification read.

**Confirmation dialog (irreversible actions):** Elevated glass modal. Action name in Inter 600 18px. Description in Inter 400 14px. "Cancel" (outline) + "[Action]" (colored per severity). Required for: sending to customer, applying payment, deleting records, accepting/declining quotes, advancing critical pipeline stages.

### DS.9 Internationalization (i18n) & RTL

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

**Unit of Measure translation:**

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

**Library:** TanStack Table + React Aria for accessibility.

**Interaction patterns:**
- Click cell to edit inline (for editable tables). Enter confirms, Escape cancels.
- Tab advances between editable cells (logical order: left-to-right in LTR, right-to-left in RTL).
- Arrow keys navigate rows/cells when table is focused.
- Sort by clicking column headers (ascending → descending → none). Sort indicator: Lucide `ChevronUp`/`ChevronDown` 12px.
- Row selection via checkbox column (first column). Shift+click for range select. Ctrl+click for multi-select.
- Bulk actions toolbar appears when rows selected: contextual buttons per module.

**Numeric columns:** Right-aligned, Geist Mono. Currency formatted per locale.

**Row states:** Hover: `var(--color-surface)` bg. Selected: `var(--color-primary)` at 8% opacity. Error: red left border 3px.

**Alternating rows:** Optional per table. Even rows: transparent. Odd rows: `var(--color-surface)` at 50% opacity.

### DS.11 Status Color System (Cross-App Consistency)

| Status | Color | Semantic | Used In |
|--------|-------|----------|---------|
| Moving / In Transit / Active | Green | Positive, progressing | Dispatch, Orders, Deliveries |
| Idle / Pending / Aging | Yellow/Amber | Attention, not urgent | Dispatch, AR, Quotes |
| Stopped / Overdue / Error | Red | Problem, action needed | Dispatch, AR, Deliveries, Payments |
| Assigned / Quoting / In Progress | Blue | In-process | Dispatch, Sales, Orders |
| Unassigned / Offline / Inactive | Gray | Neutral, no action | Dispatch, Drivers, Tasks |

Same colors, same meaning, across all 5 apps. No per-app exceptions.

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

**Package:** `@hyperquote/ui` — shared across all 5 apps.

| Component | Description |
|-----------|-------------|
| `GlassWindow` | Window-tier glass panel with spring open / tween close |
| `GlassElevated` | Elevated-tier glass panel for modals/confirmations |
| `LionMark` | SVG lion watermark (LyonBlack/LyonWhite, auto-switches by theme) |
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

Dark mode: shadow opacity increases by 1.5× for visibility against dark backgrounds.

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


---

### STATE MACHINES (Cross-Entity Lifecycle)

## ORDER & QUOTE STATE MACHINE

This section defines every state across the quote-to-cash lifecycle, how each state maps to each app surface, and the badge color per DS.11 rules.

### SM.1 Quote Request States

| State | Description | Triggered By | Terminal? |
|-------|-------------|--------------|-----------|
| `DRAFT` | Customer assembling material list, incomplete | Customer starts request | No |
| `SUBMITTED` | Material list finalized, awaiting internal review | Customer submits | No |
| `UNDER_REVIEW` | Sales reviewing for completeness and feasibility | Sales rep claims request | No |
| `SOURCING` | Procurement requesting prices from suppliers | Procurement initiates | No |
| `QUOTE_READY` | All supplier prices received, quote can be assembled | Last supplier price in or timeout | No |
| `ON_HOLD` | Paused — awaiting customer clarification or supplier response | Various | No |
| `REJECTED` | Cannot fulfill (outside area, unavailable, not creditworthy) | Sales/credit team | Yes |
| `WITHDRAWN` | Customer pulled back before quoting began | Customer | Yes |
| `CANCELLED` | System/admin cancelled (timeout, duplicate, policy) | System/admin | Yes |

**Transitions:** DRAFT → SUBMITTED → UNDER_REVIEW → SOURCING → QUOTE_READY → (creates Quote entity). Any non-terminal → ON_HOLD. ON_HOLD → UNDER_REVIEW or SOURCING (resumed) or CANCELLED (timeout).

### SM.2 Quote States

| State | Description | Triggered By | Terminal? |
|-------|-------------|--------------|-----------|
| `DRAFT` | Being assembled internally, pricing/margins/terms set | Created from QUOTE_READY | No |
| `INTERNAL_REVIEW` | Under review by sales team before approval | Sales submits for review | No |
| `PENDING_APPROVAL` | Awaiting manager approval (margin below threshold) | Review complete, approval needed | No |
| `APPROVED` | Approved by manager, ready to send to customer | Manager approves | No |
| `SENT` | Delivered to customer, expiry clock starts | Sales rep sends | No |
| `VIEWED` | Customer opened/viewed the quote (tracked) | Email/portal tracking | No |
| `NEGOTIATING` | Customer responded with changes/counter-offers | Customer requests changes | No |
| `REVISED` | New version created from negotiation, old version archived | Sales creates new version | No |
| `ACCEPTED` | Customer formally accepted | Customer accepts | No (→ Order) |
| `DECLINED` | Customer explicitly rejected | Customer | Yes |
| `EXPIRED` | Validity period elapsed without response | System cron | Yes* |
| `CANCELLED` | Cancelled by internal team | Sales/admin | Yes |
| `REQUIRES_RE_QUOTE` | Prices changed or expired, must re-price | System/procurement | No |

*EXPIRED can transition to REQUIRES_RE_QUOTE if customer later wants to proceed.

**Internal flow:** DRAFT → INTERNAL_REVIEW → PENDING_APPROVAL → APPROVED → SENT. If margin is above threshold, INTERNAL_REVIEW → APPROVED (skip PENDING_APPROVAL).

**Negotiation loop:** SENT → VIEWED → NEGOTIATING → REVISED → SENT (new version). Versioning: `Q-2026-00142-v1`, `-v2`, etc.

**Partial acceptance:** Line-item level accept/decline. Accepted items form one order; declined items die or become a new quote request.

### SM.3 Order States

| State | Description | Triggered By | Terminal? |
|-------|-------------|--------------|-----------|
| `CONFIRMED` | Created from accepted quote, credit check passed | Quote accepted + credit OK | No |
| `PROCESSING` | Supplier POs placed, materials being sourced | All supplier POs generated | No |
| `PARTIALLY_FULFILLED` | Some deliveries completed, others pending | First delivery confirmed | No |
| `FULFILLED` | All line items delivered, awaiting final payment | Last delivery confirmed | No |
| `COMPLETED` | All delivered, all invoiced, all paid | Last payment matched | Yes |
| `ON_HOLD` | Paused (credit limit, customer request, supplier issue) | Manual or system | No |
| `CANCELLATION_REQUESTED` | Cancel initiated, may need review if POs in progress | Customer or internal | No |
| `CANCELLED` | Fully or partially cancelled | Cancellation approved | Yes |
| `BACK_ORDERED` | Items unavailable, supplier stockout or production delay | Supplier cannot fulfill | No |

**Transitions:** CONFIRMED → PROCESSING → PARTIALLY_FULFILLED → FULFILLED → COMPLETED. CONFIRMED can also → ON_HOLD, CANCELLATION_REQUESTED, or BACK_ORDERED.

### SM.4 Supplier PO States (Internal Only)

| State | Description | Terminal? |
|-------|-------------|-----------|
| `DRAFT` | PO being prepared | No |
| `SENT` | Transmitted to supplier | No |
| `CONFIRMED` | Supplier accepted, delivery date confirmed | No |
| `IN_PRODUCTION` | Supplier manufacturing (custom items) | No |
| `SHIPPED` | Supplier dispatched goods | No |
| `PARTIALLY_RECEIVED` | Some items received | No |
| `RECEIVED` | All goods received, pending QC | No |
| `INSPECTED` | QC completed | No |
| `CLOSED` | Fully fulfilled and reconciled | Yes |
| `REJECTED` | Supplier declined PO | Yes |
| `CANCELLED` | Cancelled by internal team | Yes |

### SM.5 Delivery States

| State | Description | Terminal? |
|-------|-------------|-----------|
| `SCHEDULED` | Date/time confirmed, driver assigned | No |
| `PICKING_LOADING` | Warehouse picking and loading | No |
| `DISPATCHED` | Vehicle left warehouse | No |
| `IN_TRANSIT` | En route, GPS tracking active | No |
| `AT_SITE` | Arrived at construction site | No |
| `DELIVERED` | All items unloaded, POD signed | Yes |
| `PARTIALLY_DELIVERED` | Some items delivered, others refused | No |
| `FAILED` | Could not complete (site inaccessible, breakdown) | No |
| `RESCHEDULED` | Failed delivery reassigned to new date | No |
| `RETURNED` | Customer rejected delivery at site | Yes |
| `CANCELLED` | Cancelled before dispatch | Yes |

### SM.6 Invoice States

| State | Description | Terminal? |
|-------|-------------|-----------|
| `DRAFT` | Generated from delivery, under review | No |
| `SENT` | Transmitted to customer, payment clock starts | No |
| `VIEWED` | Customer opened/viewed | No |
| `PARTIALLY_PAID` | Some payment received, balance remains | No |
| `PAID` | Full payment received and matched | Yes |
| `OVERDUE` | Payment not received by due date | No |
| `COLLECTIONS` | Escalated to formal collection (60+ days) | No |
| `DISPUTED` | Customer contests the invoice | No |
| `ADJUSTED` | Amount changed via credit note | No |
| `CANCELLED` | Voided (incorrect, duplicate) | Yes |
| `WRITTEN_OFF` | Deemed uncollectible, bad debt | Yes |

### SM.7 Payment States

| State | Description | Terminal? |
|-------|-------------|-----------|
| `EXPECTED` | Anticipated based on invoice terms | No |
| `RECEIVED` | Bank confirms funds, not yet matched | No |
| `MATCHED` | Linked to specific invoice(s) | No |
| `FULLY_APPLIED` | Fully consumed against invoices | Yes |
| `PARTIALLY_APPLIED` | Applied but doesn't cover full balance | No |
| `OVERPAYMENT` | Exceeds invoice total | No |
| `UNMATCHED` | Received but can't identify payer/reference | No |
| `BOUNCED` | Cheque bounced or wire reversed | Yes* |
| `REFUNDED` | Overpayment returned to customer | Yes |

*BOUNCED causes related invoice to revert to SENT/OVERDUE.

### SM.8 Cross-App State Mapping

How each entity state appears in each app:

**Quote Request States:**

| Backend State | Portal (Customer) | Internal (Ops) | CEO | Badge Color |
|---------------|-------------------|----------------|-----|-------------|
| DRAFT | "Draft" | "Draft" | "Draft" | Gray |
| SUBMITTED | "Submitted" | "New Request" | "Submitted" | Blue |
| UNDER_REVIEW | "Under Review" | "Under Review" | "Under Review" | Blue |
| SOURCING | "Being Priced" | "Sourcing" | "Sourcing" | Blue |
| QUOTE_READY | "Quote Ready" | "Quote Ready" | "Quote Ready" | Green |
| ON_HOLD | "On Hold" | "On Hold — [reason]" | "On Hold" | Yellow |
| WITHDRAWN | "Withdrawn" | "Withdrawn by Customer" | "Withdrawn" | Gray |
| CANCELLED | "Cancelled" | "Cancelled — [reason]" | "Cancelled" | Red |
| REJECTED | "Cannot Fulfill" | "Rejected — [reason]" | "Rejected" | Red |

**Quote States:**

| Backend State | Portal (Customer) | Internal (Ops) | CEO | Badge Color |
|---------------|-------------------|----------------|-----|-------------|
| DRAFT | _(not visible)_ | "Draft" | "Draft" | Gray |
| INTERNAL_REVIEW | _(not visible)_ | "Internal Review" | "In Review" | Blue |
| PENDING_APPROVAL | _(not visible)_ | "Pending Approval" | "Awaiting Approval" | Yellow |
| APPROVED | _(not visible)_ | "Approved" | "Approved" | Green |
| SENT | "Quote Received" | "Quote Sent" | "Quote Sent" | Blue |
| VIEWED | "Quote Received" | "Viewed by Customer" | "Viewed" | Blue |
| NEGOTIATING | "Negotiating" | "Negotiating" | "Negotiating" | Yellow |
| REVISED | "Updated Quote" | "Revised" | "Revised" | Yellow |
| ACCEPTED | "Accepted" | "Accepted" | "Accepted" | Green |
| DECLINED | "Declined" | "Declined" | "Declined" | Red |
| EXPIRED | "Expired" | "Expired" | "Expired" | Red |
| CANCELLED | "Cancelled" | "Cancelled — [reason]" | "Cancelled" | Red |
| REQUIRES_RE_QUOTE | _(not visible)_ | "Requires Re-Quote" | "Re-Quote Needed" | Yellow |

**Order States:**

| Backend State | Portal (Customer) | Internal (Ops) | CEO | Badge Color |
|---------------|-------------------|----------------|-----|-------------|
| CONFIRMED | "Order Confirmed" | "Confirmed" | "Confirmed" | Green |
| PROCESSING | "Being Prepared" | "Processing" | "Processing" | Blue |
| PARTIALLY_FULFILLED | "Partially Delivered" | "Partial Fulfillment" | "Partial" | Yellow |
| BACK_ORDERED | "Awaiting Stock" | "Back Ordered" | "Back Ordered" | Yellow |
| FULFILLED | "Delivered" | "Fulfilled" | "Fulfilled" | Green |
| COMPLETED | "Completed" | "Completed" | "Completed" | Green |
| ON_HOLD | "On Hold" | "On Hold — [reason]" | "On Hold" | Yellow |
| CANCELLATION_REQUESTED | "Cancellation Pending" | "Cancel Requested" | "Cancel Req." | Yellow |
| CANCELLED | "Cancelled" | "Cancelled — [reason]" | "Cancelled" | Red |

**Delivery States:**

| Backend State | Portal | Internal | CEO | Driver App | Badge Color |
|---------------|--------|----------|-----|------------|-------------|
| SCHEDULED | "Delivery Scheduled" | "Scheduled [date]" | "Scheduled" | "Upcoming" | Blue |
| PICKING_LOADING | _(not visible)_ | "Picking & Loading" | "Loading" | "Loading" | Blue |
| DISPATCHED | "Out for Delivery" | "Dispatched" | "Dispatched" | "Start Route" | Blue |
| IN_TRANSIT | "Out for Delivery" | "In Transit" | "In Transit" | "Navigating" | Green |
| AT_SITE | "Driver at Site" | "At Site" | "At Site" | "Arrived" | Green |
| DELIVERED | "Delivered" | "Delivered (POD)" | "Delivered" | "Completed" | Green |
| PARTIALLY_DELIVERED | "Partially Delivered" | "Partial Delivery" | "Partial" | "Partial" | Yellow |
| RESCHEDULED | "Delivery Rescheduled" | "Rescheduled — [date]" | "Rescheduled" | "Rescheduled" | Yellow |
| RETURNED | "Delivery Returned" | "Returned — [reason]" | "Returned" | "Returned" | Red |
| FAILED | "Delivery Issue" | "Failed — [reason]" | "Failed" | "Failed" | Red |
| CANCELLED | "Delivery Cancelled" | "Cancelled — [reason]" | "Cancelled" | "Cancelled" | Red |

**Supplier PO States (Internal + Supplier Portal only):**

| Backend State | Supplier Portal | Internal (Procurement) | CEO | Badge Color |
|---------------|----------------|----------------------|-----|-------------|
| DRAFT | _(not visible)_ | "PO Draft" | "Draft" | Gray |
| SENT | "New PO" | "PO Sent" | "Sent" | Blue |
| CONFIRMED | "Confirmed" | "Supplier Confirmed" | "Confirmed" | Green |
| IN_PRODUCTION | "In Production" | "Manufacturing" | "In Production" | Blue |
| SHIPPED | "Shipped" | "Shipped" | "Shipped" | Blue |
| PARTIALLY_RECEIVED | _(not visible)_ | "Partial Receipt" | "Partial" | Yellow |
| RECEIVED | _(not visible)_ | "Received" | "Received" | Green |
| INSPECTED | _(not visible)_ | "QC Complete" | "Inspected" | Green |
| CLOSED | "Completed" | "Closed" | "Closed" | Green |
| REJECTED | "Rejected" | "Supplier Rejected" | "Rejected" | Red |
| CANCELLED | "Cancelled" | "PO Cancelled" | "Cancelled" | Red |

**Invoice States:**

| Backend State | Portal (Customer) | Internal (Ops) | CEO | Badge Color |
|---------------|-------------------|----------------|-----|-------------|
| DRAFT | _(not visible)_ | "Draft" | "Draft" | Gray |
| SENT | "Invoice Due" | "Sent" | "Sent" | Blue |
| VIEWED | "Invoice Due" | "Viewed by Customer" | "Viewed" | Blue |
| PARTIALLY_PAID | "Partially Paid" | "Partial Payment" | "Partial" | Yellow |
| PAID | "Paid" | "Paid" | "Paid" | Green |
| OVERDUE | "Payment Overdue" | "Overdue [days]" | "Overdue" | Red |
| COLLECTIONS | "Payment Overdue" | "Collections" | "Collections" | Red |
| DISPUTED | "Under Dispute" | "Disputed" | "Disputed" | Yellow |
| ADJUSTED | "Invoice Updated" | "Adjusted — [reason]" | "Adjusted" | Yellow |
| CANCELLED | "Invoice Cancelled" | "Cancelled — [reason]" | "Cancelled" | Red |
| WRITTEN_OFF | _(not visible)_ | "Written Off" | "Written Off" | Red |

**Payment States:**

| Backend State | Portal (Customer) | Internal (Ops) | CEO | Badge Color |
|---------------|-------------------|----------------|-----|-------------|
| EXPECTED | _(not visible)_ | "Expected" | "Expected" | Gray |
| RECEIVED | "Payment Received" | "Received" | "Received" | Blue |
| MATCHED | _(not visible)_ | "Matched" | "Matched" | Green |
| FULLY_APPLIED | "Payment Received" | "Applied" | "Applied" | Green |
| PARTIALLY_APPLIED | "Payment Received" | "Partially Applied" | "Partial" | Yellow |
| OVERPAYMENT | "Payment Received" | "Overpayment — [amount]" | "Overpayment" | Yellow |
| UNMATCHED | _(not visible)_ | "Unmatched" | "Unmatched" | Yellow |
| BOUNCED | "Payment Issue" | "Bounced" | "Bounced" | Red |
| REFUNDED | "Refund Issued" | "Refunded" | "Refunded" | Blue |


---

### ROUTE MAP (All 5 Apps)

**Website (`hyperquote.net`):**

| Route | Page | Rendering |
|-------|------|-----------|
| `/` | Home | SSG |
| `/about` | About | SSG |
| `/market` | Market Catalog | SSR (search params) |
| `/market/[slug]` | Product Detail | SSR |
| `/support` | Support | SSR |
| `/docs` | Docs (skeleton) | SSG |
| `/docs/[slug]` | Doc Article | SSG |
| `/careers` | Careers | SSG |
| `/legal/privacy` | Privacy Policy | SSG |
| `/legal/terms` | Terms of Use | SSG |

**Portal (`portal.hyperquote.net`):**

| Route | Window/View | Auth |
|-------|-------------|------|
| `/` | Home canvas (AI chat + Orders/Market buttons) | Required |
| `/orders` | Orders window | Required |
| `/orders/new` | Material list builder (sub-view of Orders) | Required |
| `/orders/[id]` | Quote/order detail (sub-view of Orders) | Required |
| `/market` | Market window | Required |
| `/market/[slug]` | Product detail (sub-view of Market) | Required |
| `/notifications` | Notifications window | Required |
| `/documents` | Documents window | Required |
| `/support` | Support window | Required |
| `/settings` | Settings window | Required |
| `/supplier` | Supplier home (supplier role toggle) | Required + supplier role |
| `/supplier/stock` | Stock & pricing (supplier view) | Required + supplier role |
| `/supplier/orders` | PO inbox (supplier view) | Required + supplier role |
| `/supplier/invoices` | Invoice submission (supplier view) | Required + supplier role |
| `/supplier/analytics` | Analytics (supplier view) | Required + supplier role |
| `/join` | Team invitation acceptance | Token-based |

**Internal Platform (`app.hyperquote.net`):**

| Route | Module/Window | Auth | Hotkey |
|-------|--------------|------|--------|
| `/` | Canvas (greeting + urgent items) | Required | — |
| `/?module=sales` | Sales window | Required + role | `S` |
| `/?module=procurement` | Procurement window | Required + role | `P` |
| `/?module=orders` | Orders/Operations window | Required + role | `O` |
| `/?module=warehouse` | Warehouse window | Required + role | `W` |
| `/?module=finance` | Finance window | Required + role | `F` |
| `/?module=dispatch` | Dispatch window | Required + role | `D` |
| `/?module=support` | Customer Service window | Required + role | `C` |
| `/?module=hr` | HR window | Required + role | `H` |
| `/?module=admin` | Admin window | Required + admin | `A` |
| `/?module=reports` | Reports window | Required + role | `R` |
| `/?module=ai` | AI Assistant window | Required | `I` |
| `/settings` | Settings | Required | — |

Internal uses URL search params (not path segments) for module routing — glass windows overlay the canvas without full-page navigation.

**CEO App (`ceo.hyperquote.net`):**

| Route | Screen | Auth |
|-------|--------|------|
| `/login` | Login | No |
| `/` | Home (search bar + lion) | Required |
| `/?q=[query]` | Search results | Required |
| `/[entity_type]/[id]` | Entity detail (employee/customer/order/invoice/supplier/delivery/product) | Required |
| `/?view=attention` | Attention items list | Required |
| `/?view=digest` | Daily digest | Required |
| `/?view=weekly` | Weekly insight | Required |
| `/settings` | Settings | Required |

**Driver App (`driver.hyperquote.net`):**

| Route | Screen | Auth |
|-------|--------|------|
| `/login` | Login | No |
| `/` | Shift start / Home dashboard | Required |
| `/route` | Route overview | Required |
| `/route/[stopId]` | Stop detail | Required |
| `/route/[stopId]/navigate` | Navigation | Required |
| `/route/[stopId]/deliver` | Delivery execution + POD | Required |
| `/route/[stopId]/exception` | Exception reporting | Required |
| `/earnings` | Earnings (external drivers) | Required |
| `/settings` | Settings | Required |


---

## PART 2: APPLICATIONS

> **Implementation:** TanStack Start SSG+SSR | Deploy: Cloudflare Workers | Auth: Supabase SSR (SSO cookie on `.hyperquote.net`)
> **Key packages:** react-aria-components, motion, fuse.js, @tanstack/ai-react
> **Shared packages:** @hyperquote/ui, @hyperquote/auth, @hyperquote/i18n, @hyperquote/forms

## APP 1: WEBSITE (hyperquote.net)

**Architecture:** TanStack Start, SSG + SSR on Cloudflare Workers.
**Purpose:** Public-facing marketing site + product catalog with price ranges + lead capture. NOT an app.
**Design tier:** Godly-level, award-winning modern B2B. Cinematic sections for Home/About; functional layouts for Market/Support/Docs/Careers.
**Font base:** 16px for body text (website exception to the 14px default).

### 1.1 Global Layout — Website Shell

**Header (fixed, all pages):**
- Height: 64px desktop, 56px mobile.
- Background: `var(--color-base)` with `backdrop-filter: blur(12px)` and 80% opacity on scroll. Transition: scroll position > 8px triggers blur. CSS transition, not Motion.
- Left: HyperQuote wordmark logo. `LyonBlack.svg` in light mode, `LyonWhite.svg` in dark mode. Height 28px. Links to `/`. `aria-label="HyperQuote — Home"`.
- Center: Navigation links in a horizontal row. Items: "Market", "About", "Support", "Docs". Each is a `<Link>` rendered as a React Aria `Link` component. Font: Inter 500, 14px. Color: `var(--color-text)`. Hover: `var(--color-primary)`. Active page: `var(--color-primary)` with a 2px bottom border (blue). Underline offset 6px from text baseline. Desktop only — hidden on mobile.
- Right cluster (horizontal, 8px gap):
  - Language toggle: button showing "AR" or "EN" in Inter 600 12px. On click: toggles `i18next.changeLanguage()`, sets `dir="rtl"` or `dir="ltr"` on `<html>`, stores preference in localStorage. React Aria `Button` with `aria-label="Switch to Arabic"` / `aria-label="التبديل إلى الإنجليزية"`.
  - Theme toggle: Lucide `Sun` (light mode) or `Moon` (dark mode) icon, 20px, in a React Aria `ToggleButton`. Sets `data-theme="dark"` on `<html>`. Preference stored in localStorage, system preference respected on first load.
  - "Get a Quote" CTA button: Blue (`var(--color-primary)`) background, white text, Inter 600 14px, height 36px, px-16px, rounded-lg (8px). Hover: `brightness(1.1)`. Active: `scale(0.98)`. On click: if logged in, navigates to `portal.hyperquote.net/orders?action=new-quote`. If not logged in, opens the Login Modal (see 1.9).
- Mobile (< 768px): Center nav hidden. Hamburger icon (Lucide `Menu`, 24px) appears to the left of the right cluster. On tap: full-screen overlay slides down from top (spring enter, 300ms). Overlay contains: nav links vertically stacked (Inter 600 24px, 56px row height each), language toggle, theme toggle, "Get a Quote" CTA (full width, 48px height), and a close button (Lucide `X`, 24px) at top-right. Overlay background: `var(--color-base)` at 100% opacity. Focus trapped inside overlay when open (React Aria `Modal`).

**Footer (all pages):**
- Background: `var(--color-base-alt)` (light: #EFF6FF, dark: #18181B).
- Top section (py-48px, max-width 1280px, centered):
  - 4-column grid on desktop (3-column tablet, 1-column mobile stacked).
  - Column 1 — Brand: LyonBlack/LyonWhite SVG at 48px height. Tagline: "Build the Future, Faster." in Inter 400 14px, `var(--color-text-muted)`. Below: social links (if any) as icon buttons 20px.
  - Column 2 — Platform: links to Market, Portal Login, Get a Quote, Support.
  - Column 3 — Company: links to About, Careers, Docs.
  - Column 4 — Legal: links to Privacy Policy (`/legal/privacy`), Terms of Use (`/legal/terms`), WhatsApp consent notice link.
  - All footer links: Inter 400 14px, `var(--color-text-muted)`. Hover: `var(--color-text)`. Each column has a heading in Inter 600 12px, `var(--color-text-subtle)`, uppercase, letter-spacing 0.05em, mb-12px.
- Bottom section (py-16px, border-top 1px `var(--color-border)`):
  - Left: "© 2026 HyperQuote. All rights reserved." Inter 400 12px, `var(--color-text-muted)`.
  - Right: Language + region indicator: "Egypt · العربية" or "Egypt · English".

**Offline banner:** When navigator.onLine is false, a 32px-height banner appears at the very top of the viewport (above header, pushes content down). Background: `var(--color-warning-bg)`. Text: "You're offline" in Inter 500 12px, `var(--color-warning)`, centered. Lucide `WifiOff` icon 16px inline-start. Auto-dismisses when connection restores. CSS transition (slide down 200ms, slide up 200ms).

---

### 1.2 Home Page

**Route:** `/`
**Rendering:** SSG with revalidation. Static content, regenerated on deploy.
**Meta:** `<title>HyperQuote — Build the Future, Faster</title>`. OG image: branded hero snapshot. Description: "Egypt's first digital platform for building materials. Get quotes in hours, not days."

**Section 1 — Hero (100vh, first viewport):**
- Background: Full-bleed real photography of an Egyptian construction site (loaded via `<img>` with `loading="eager"`, `fetchpriority="high"`, `srcset` for responsive). Image darkened with a CSS gradient overlay: `linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.7))`. Dark mode: overlay opacity increases to 0.7/0.85.
- Content container: max-width 1280px, centered, flex column, items vertically centered.
- Headline: "Build the Future, Faster." — Inter 800, 48px desktop / 32px mobile, white (#FFFFFF always — over dark photo). `text-balance` for wrapping. Appears with spring animation (opacity 0 → 1, translateY 20px → 0, stiffness 120, damping 14) on page load.
- Subheadline: "Egypt's first digital platform for building materials sourcing. Get quotes in hours, not days." — Inter 400, 20px desktop / 16px mobile, white at 85% opacity. Appears 100ms after headline with same spring animation.
- CTA cluster (mt-32px, flex row, gap 16px, flex-wrap on mobile):
  - Primary: "Get a Quote" — blue background (#2563EB), white text, Inter 600, 18px, height 56px, px-32px, rounded-xl (12px). Hover: `brightness(1.1)`. Active: `scale(0.98)`. On click: same logic as header CTA.
  - Secondary: "Browse Market" — transparent background, white border 1.5px, white text, Inter 500, 18px, height 56px, px-32px, rounded-xl. Hover: white background at 10% opacity. Links to `/market`.
- Trust bar (mt-48px): Horizontal row of 3-4 metrics in Geist Mono 14px, white at 70% opacity, separated by vertical dividers (1px white at 20%). Example: "500+ Products · 50+ Suppliers · 4hr Quote Response". Numbers in Geist Mono, labels in Inter. Spring animation staggered 200ms after CTAs.
- Scroll indicator: Lucide `ChevronDown` icon, 24px, white at 50% opacity, positioned at bottom center of hero, 32px from bottom. Gentle bounce animation (CSS `@keyframes`, translateY 0 → 8px, 1.5s ease-in-out infinite). On click: smooth scroll to Section 2.

**Section 2 — How It Works (var(--color-base) background):**
- py-96px desktop, py-64px mobile. Max-width 1280px centered.
- Section heading: "How It Works" — Inter 700, 30px, `var(--color-text)`, text-center. Below: subheading in Inter 400 16px, `var(--color-text-muted)`: "From material list to delivery in four simple steps."
- 4-step horizontal flow (desktop: 4 columns with connecting lines. Mobile: vertical stack).
- Each step card:
  - Number: Geist Mono 600, 48px, `var(--color-primary)` at 20% opacity. "01", "02", "03", "04".
  - Icon: Lucide icon, 32px, `var(--color-primary)`. Step 1: `ClipboardList`. Step 2: `MessageSquare`. Step 3: `Truck`. Step 4: `CheckCircle`.
  - Title: Inter 600, 18px, `var(--color-text)`. Step 1: "Build Your List". Step 2: "Get a Quote". Step 3: "We Deliver". Step 4: "Track Everything".
  - Description: Inter 400, 14px, `var(--color-text-muted)`, 2-3 lines.
  - Connecting line between steps (desktop only): 1px dashed `var(--color-border)` horizontal line at icon center height.
- Scroll-triggered reveal: each card fades in with spring (opacity 0 → 1, translateY 16px → 0) as it enters the viewport. Staggered 100ms per card. Triggered via IntersectionObserver at 20% visibility.

**Section 3 — Value Propositions (var(--color-base-alt) background):**
- py-96px desktop. 3-column grid (1-column mobile). Max-width 1280px centered.
- Section heading: "Why HyperQuote" — same style as section 2 heading.
- 6 value prop cards in a 3x2 grid (2x3 on tablet, 1x6 mobile):
  - Each card: bg `var(--color-card)`, rounded-xl (12px), p-32px, subtle shadow (`shadow-sm`). Hover: `translateY(-2px)` + `shadow-md`, 150ms ease.
  - Icon: Lucide, 24px, `var(--color-primary)`. Title: Inter 600 16px. Description: Inter 400 14px `var(--color-text-muted)`.
  - Cards: AI-Powered Ordering (`Bot`), 4-Hour Quotes (`Clock`), Real-Time Tracking (`MapPin`), Project Organization (`FolderOpen`), Transparent Pricing (`BadgePercent`), WhatsApp Support (`MessageCircle`).
- Scroll-triggered reveal: cards stagger in from bottom.

**Section 4 — Market Preview (var(--color-base) background):**
- py-96px. Max-width 1280px centered.
- Section heading: "Browse Our Market" — same heading style.
- Grid of 6-8 product category cards. Each card:
  - Real photography background (category image) with dark gradient overlay.
  - Category name: Inter 600 18px, white, positioned bottom-left with p-24px.
  - Product count badge: Geist Mono 12px, white bg at 20% opacity, rounded-full, px-8px py-2px. Example: "120+ Products".
  - Hover: image `scale(1.03)` with overflow hidden on card. 200ms ease.
  - On click: navigates to `/market?category={slug}`.
  - Card dimensions: 280px min-width, aspect ratio 4:3. Grid: auto-fill with minmax.
- Below grid: "View All Products" link — Inter 500 14px, `var(--color-primary)`, with Lucide `ArrowRight` 16px inline-end. Links to `/market`.

**Section 5 — CTA Section (gradient background):**
- Background: `linear-gradient(135deg, #2563EB, #1d4ed8)`.
- py-96px. Max-width 800px centered. Text-center.
- Heading: "Ready to Build?" — Inter 800 36px, white.
- Subheading: "Join hundreds of Egyptian contractors who source smarter." — Inter 400 18px, white at 85% opacity.
- CTA: "Get Started — Free" — white background, `var(--color-primary)` text, Inter 600 18px, height 56px, px-32px, rounded-xl. Hover: white at 95% opacity. On click: same as header CTA.
- Below CTA: "No credit card required. Quote requests are always free." — Inter 400 14px, white at 60% opacity.

**Loading state:** The hero image has a placeholder: `var(--color-base-alt)` solid color while loading. Below-the-fold sections render server-side so no skeleton needed.

**Empty state:** N/A — static content page.

**Error state:** If SSG/SSR fails, show a centered error: Lucide `AlertTriangle` 48px `var(--color-error)`, "Something went wrong" Inter 600 18px, "Please try refreshing the page" Inter 400 14px `var(--color-text-muted)`, and a "Refresh" button (blue, 40px height).

**Mobile adaptation:** All sections stack vertically. Hero CTA buttons stack vertically (full width). Grid sections become single column. Typography scales down per the token scale. Padding reduces: py-64px instead of py-96px.

**RTL/Arabic:** All text aligns `text-start`. "ArrowRight" icons flip to "ArrowLeft" via CSS `[dir="rtl"] .icon-end { transform: scaleX(-1) }`. Trust bar metrics maintain LTR number direction inside RTL flow (Geist Mono with `direction: ltr; unicode-bidi: embed`). CTA text is translated. Section reading order unchanged (top to bottom).

---

### 1.3 About Page

**Route:** `/about`
**Rendering:** SSG.
**Meta:** `<title>About HyperQuote — Our Story</title>`.

**Section 1 — Hero (70vh):**
- Real photography: Cairo skyline or Egyptian construction panorama. Same overlay treatment as home hero.
- Heading: "Building Egypt's Future" — Inter 800 40px, white.
- Subheading: Company mission statement, 2-3 sentences — Inter 400 18px, white at 85%.

**Section 2 — Company Story (var(--color-base)):**
- py-96px. Max-width 800px centered (reading width). Prose layout.
- Content blocks: alternating text and real photography. Each photography block is full-width within the 800px container, rounded-xl, with a caption in Inter 400 12px `var(--color-text-muted)`.
- Headings within: Inter 700 24px. Body: Inter 400 16px, line-height 1.75. `var(--color-text)`.

**Section 3 — Mission & Values (var(--color-base-alt)):**
- py-96px. 3-column grid of value cards (same card pattern as home value props).
- Values: Technology-First, Customer-Obsessed, Radical Transparency (or whatever brand values are defined).

**Section 4 — Team (var(--color-base)):**
- py-96px. Grid of team member cards. Each card:
  - Real headshot photo: 80px circle, object-cover. Fallback: initials in a blue circle (Inter 600 24px white on `var(--color-primary)` bg).
  - Name: Inter 600 16px. Title: Inter 400 14px `var(--color-text-muted)`.
  - No social links (B2B, not a startup vanity page).

**Section 5 — Careers CTA (var(--color-base-alt)):**
- If careers content exists: heading "Join Our Team", brief text, link to `/careers`.
- If no open positions: "We're always looking for talented people. Send us your CV." with email link.

**Mobile / RTL:** Same patterns as home page. Team grid becomes 2-column on tablet, 1-column on mobile.

---

### 1.4 Market Page (Catalog)

**Route:** `/market`
**Rendering:** SSR. Product data fetched at request time from server function (cached 5 min via Workers Cache API).
**Meta:** `<title>Building Materials Market — HyperQuote</title>`.

**This is a FUNCTIONAL page — content-driven layout, NOT cinematic.**

**Layout:**
- No hero section. Header directly above content.
- py-32px. Max-width 1440px centered.

**Search bar (top, full width of content area):**
- React Aria `SearchField`. Height 48px. Rounded-xl (12px). Border 1px `var(--color-border)`. Background `var(--color-card)`.
- Lucide `Search` icon 20px at inline-start, `var(--color-text-muted)`. Placeholder: "Search building materials..." / "ابحث في مواد البناء...".
- On input (debounced 300ms): filters product list client-side via fuse.js fuzzy search. If no results locally, triggers server search.
- Clear button (Lucide `X` 16px) appears when input has value. On click: clears input, resets to full list.
- On Enter: navigates to `/market?q={query}` (URL state via TanStack Router search params).

**Filter sidebar (inline-start, 256px width desktop):**
- Sticky, top 80px (below header). Scrollable if filters exceed viewport.
- Heading: "Filters" / "تصفية" — Inter 600 14px.
- Filter groups (React Aria `Disclosure` / collapsible sections):
  - **Category:** Checkboxes (React Aria `CheckboxGroup`). Populated from API categories. Each checkbox: 16px square, blue fill when checked, label Inter 400 14px. Shows count in parentheses in Geist Mono 12px `var(--color-text-muted)`. Example: "Cement (47)".
  - **Availability:** Radio group (React Aria `RadioGroup`). Options: "All", "Available", "Low Stock". Default: "All".
  - **Price Range:** Displayed as text labels since exact prices are hidden. Options: checkboxes for "Budget", "Mid-Range", "Premium". These map to internal price tier classifications.
- "Clear All" link at top of sidebar: Inter 500 12px, `var(--color-primary)`. Visible only when any filter is active. On click: resets all filters, updates URL params.
- Mobile (< 1024px): Sidebar hidden. A "Filters" button (Lucide `SlidersHorizontal` 20px + "Filters" text, height 40px, border 1px `var(--color-border)`, rounded-lg) appears above the product grid. On tap: opens a bottom sheet (React Aria `Modal` with `isDismissable`). Sheet slides up from bottom (spring, 200ms). Contains same filter groups. "Apply" button (blue, full width, 48px) at bottom of sheet. "Reset" link next to it.
- Filter changes update URL search params: `/market?category=cement,steel&availability=available`. TanStack Router `validateSearch` with Zod schema.

**Product grid (inline-end of sidebar, fills remaining width):**
- Toolbar above grid:
  - Left: Result count — "Showing 47 products" / Geist Mono 14px for "47", Inter 400 14px for rest. `var(--color-text-muted)`.
  - Right: Sort dropdown (React Aria `Select`). Options: "Relevance", "Name A-Z" / "Name Z-A", "Category", "Availability". Default: "Relevance" (or "Category" if no search query). Height 36px, border 1px `var(--color-border)`, rounded-lg. Width auto (content-fitted). Lucide `ChevronsUpDown` 16px as trigger icon.
  - Right: View toggle — grid/list (React Aria `ToggleButton` pair). Lucide `Grid3x3` and `List` icons, 20px. Active view: `var(--color-primary)` icon + `var(--color-primary)` bg at 10% opacity. Inactive: `var(--color-text-muted)`. Stored in localStorage.
- Grid view: 3 columns desktop (> 1280px), 2 columns (768-1280px), 1 column mobile. Gap 16px.
- Each product card (grid view):
  - Background: `var(--color-card)`. Rounded-xl (12px). Border 1px `var(--color-border)`. Overflow hidden.
  - Image area: aspect ratio 4:3. Object-cover. If no image: `var(--color-surface)` background with Lucide `Package` icon 48px `var(--color-text-subtle)` centered.
  - Content area: p-16px.
  - Product name: Inter 600 14px `var(--color-text)`. Bilingual: primary language name on line 1, secondary in 12px `var(--color-text-muted)` on line 2. Truncated with `line-clamp-2`.
  - Category badge: Inter 500 11px, `var(--color-primary)` text, `var(--color-info-bg)` background, rounded-sm (4px), px-6px py-2px. mb-8px.
  - Price range: Geist Mono 14px `var(--color-text)`. Format: "From EGP 45/bag" (EN) or "من ٤٥ ج.م/كيس" (AR). If no range available: "Price on Request" / "السعر عند الطلب" in Inter 400 12px `var(--color-text-muted)`.
  - Availability indicator: colored dot (8px circle) + text label. Available: `var(--color-success)` + "Available". Low Stock: `var(--color-warning)` + "Low Stock". On Request: `var(--color-text-muted)` + "On Request". Text: Inter 400 12px. Dot + text inline.
  - Hover: `translateY(-2px)`, `shadow-md`. 150ms ease.
  - On click: navigates to `/market/{product-slug}`.
  - "Add to Quote" button: appears on hover (desktop) or always visible (mobile). Blue outline button, height 36px, full width of content area. Inter 500 13px, `var(--color-primary)` text, border 1.5px `var(--color-primary)`, rounded-lg. Hover: blue bg at 10%. On click:
    - If logged in: opens a popover (React Aria `Popover`, CSS transition) with quantity input (React Aria `NumberField`, min 1, step 1, value 1, width 120px) + "Add" button (blue, 36px). On "Add": calls server function to add item to active draft quote. Toast: "Added to quote" (success). If no active draft: creates one automatically.
    - If not logged in: opens Login Modal (1.9) with a message "Sign in to add items to your quote."

- List view: Full-width rows. Each row: 80px height, flex row, items-center, py-8px, border-bottom 1px `var(--color-border)`.
  - Thumbnail: 48px square, rounded-lg, object-cover. If no image: `var(--color-surface)` with Lucide `Package` 20px.
  - Name: Inter 500 14px, flex-1. Bilingual: primary name, secondary in 12px muted after a ` · ` separator.
  - Category: Inter 400 12px `var(--color-text-muted)`, 120px width.
  - Price range: Geist Mono 14px, 140px width.
  - Availability: dot + label, 120px width.
  - "Add to Quote": icon-only button (Lucide `Plus` 20px, 36px square, rounded-lg, blue outline). Same behavior as grid view.
  - Hover: row background `var(--color-surface)`.
  - On click (outside the "Add" button): navigates to product detail.

**Pagination:**
- Below grid. Centered. Uses React Aria `ListBox` as page selector.
- Pattern: "< Prev" (Lucide `ChevronLeft` 16px + text) + page numbers (1, 2, 3, ..., 12) + "Next >" (text + Lucide `ChevronRight` 16px).
- Active page: blue bg, white text, rounded-lg 32px square. Other pages: `var(--color-text)`, hover `var(--color-surface)`. Prev/Next: disabled state at first/last page (opacity 0.5, cursor-not-allowed).
- 24 products per page. URL param: `/market?page=2`.
- Mobile: simplified — "< Prev" and "Next >" only, with "Page 2 of 12" text in center (Geist Mono 14px).

**Loading state:** Product grid shows 6 skeleton cards (grid) or 8 skeleton rows (list). Each skeleton: `var(--color-surface)` background with shimmer animation (CSS `@keyframes`). Image placeholder + 3 text lines of varying width. Sidebar filters show 4 skeleton disclosure groups.

**Empty state (no results):**
- Centered in grid area. Lucide `SearchX` 48px `var(--color-text-subtle)`.
- "No products found" — Inter 600 18px.
- "Try adjusting your filters or search terms" — Inter 400 14px `var(--color-text-muted)`.
- "Clear Filters" button (blue outline, 40px height) if filters are active.

**Error state:** Inline in grid area. Lucide `AlertTriangle` 48px `var(--color-error)`. "Failed to load products" + "Retry" button (blue, 40px).

**Mobile adaptation:** Filter sidebar becomes bottom sheet. Grid becomes single column. Search bar remains full width. Sort dropdown and view toggle stack horizontally. Pagination simplifies.

**RTL/Arabic:** Grid reads right-to-left. Sidebar appears at inline-start (right side in RTL). Search icon position flips. Price format: "من ٤٥ ج.م/كيس". Category badges, availability labels all translated. "Add to Quote" → "أضف للعرض". Filter labels translated. Sort options translated.

---

### 1.5 Product Detail Page

**Route:** `/market/{product-slug}`
**Rendering:** SSR. Product data fetched by slug. Cached 5 min.
**Meta:** Dynamic `<title>` from product name. Schema.org `Product` markup for SEO.

**Layout:** Max-width 1280px centered. py-32px.

**Breadcrumb (top):**
- React Aria `Breadcrumbs`. "Market > {Category} > {Product Name}".
- Each segment: Inter 400 14px, `var(--color-text-muted)`. Separator: Lucide `ChevronRight` 14px (flips in RTL). Last segment: `var(--color-text)`, not a link.

**Main content — 2-column layout (desktop), single column (mobile):**

**Column 1 (inline-start, 55% width) — Product images:**
- Primary image: aspect ratio 1:1, rounded-xl, border 1px `var(--color-border)`. Object-cover.
- Thumbnail gallery below (if multiple images): horizontal scroll, 64px squares, rounded-lg, 8px gap. Active thumbnail: border 2px `var(--color-primary)`. On click: swaps primary image (crossfade, tween 200ms).
- If no images: `var(--color-surface)` placeholder with Lucide `Package` 64px `var(--color-text-subtle)`.
- Image zoom: on hover (desktop), image scales to 1.5x within a clipped container. On mobile: tap opens full-screen image viewer (React Aria `Modal`, swipe to navigate between images, pinch to zoom).

**Column 2 (inline-end, 45% width, ps-32px) — Product info:**
- Product name: Inter 700 24px `var(--color-text)`. Bilingual: primary on line 1, secondary in Inter 400 16px `var(--color-text-muted)` below.
- Category: Clickable badge (same style as catalog card badge). Links to `/market?category={slug}`.
- SKU: "SKU: {value}" — Geist Mono 12px `var(--color-text-muted)`. Visible if SKU exists.
- Price range: Geist Mono 20px `var(--color-text)`. "From EGP 45/bag" or "Price on Request". mb-16px.
- Availability: Large indicator — dot 10px + text Inter 500 14px. Same color coding as catalog.
- Divider: 1px `var(--color-border)`, my-24px.

**Specifications table (below divider):**
- Heading: "Specifications" — Inter 600 16px. Lucide `Info` 16px inline.
- Table: alternating row backgrounds (`var(--color-base)` / `var(--color-surface)`). 2 columns: Property (Inter 500 14px `var(--color-text-muted)`) and Value (Inter 400 14px `var(--color-text)`, Geist Mono for numeric values). Rows: py-8px px-12px. No outer border, rounded-lg on container.
- Properties: dimensions, weight, material, standard/grade, origin, UOM, minimum order quantity, certifications. Only populated fields shown.

**"Request a Quote" card (sticky on scroll, desktop only):**
- Positioned at the bottom of column 2 when specifications end, but becomes sticky (top 80px) when scrolling past it.
- Background: `var(--color-card)`. Border 1px `var(--color-border)`. Rounded-xl. p-24px. Shadow-sm.
- Quantity input: React Aria `NumberField`. Label: "Quantity". Min: 1 (or product's MOQ). Step: 1. Width: full. Height 44px. Geist Mono for the number input.
- UOM display: shown next to quantity field — "bags" / "أكياس" in Inter 400 14px `var(--color-text-muted)`.
- "Add to Quote" button: full width, blue bg, white text, Inter 600 14px, height 48px, rounded-lg. Disabled until quantity >= MOQ. Disabled state: opacity 0.5, cursor-not-allowed.
  - If logged in: adds to active draft. Toast: "{Product} added to your quote". If no draft exists, creates one.
  - If not logged in: opens Login Modal with message.
- "Or contact us on WhatsApp" link below button: Inter 400 12px, `var(--color-primary)`. Lucide `MessageCircle` 14px inline. Opens `https://wa.me/{number}?text={pre-filled message with product name}`.

**Documents section (below specifications):**
- Heading: "Documents & Certifications" — Inter 600 16px. Lucide `FileText` 16px.
- List of downloadable files. Each row: Lucide `Download` 16px + filename (Inter 400 14px `var(--color-primary)`) + file size in Geist Mono 11px `var(--color-text-muted)`. On click: direct download from R2 presigned URL.
- If no documents: section hidden entirely.

**Related products (below documents):**
- Heading: "Related Products" — Inter 600 16px.
- Horizontal scroll of 4-6 product cards (same card component as catalog grid view, but smaller — 200px width). Scroll with snap points. Mobile: swipeable.

**Loading state:** Left column: image skeleton (square, shimmer). Right column: 4 text line skeletons of varying width + button skeleton.

**Error state (product not found — 404):** Centered layout. Lucide `PackageX` 48px `var(--color-text-subtle)`. "Product not found" Inter 600 18px. "This product may have been removed or the link is incorrect." Inter 400 14px muted. "Browse Market" button (blue, 40px) linking to `/market`.

**Mobile:** Single column. Image full width. Info below. Sticky card becomes fixed bottom bar: quantity input (compact, 100px) + "Add to Quote" button (flex-1) in a row, height 64px, bg `var(--color-card)`, border-top 1px, px-16px. py-8px.

**RTL/Arabic:** Columns flip (image on inline-start which is right in RTL). Breadcrumb separator flips. Price format switches. Spec table property/value columns don't swap (property always inline-start). All labels translated.

---

### 1.6 Support Page

**Route:** `/support`
**Rendering:** SSR.
**Meta:** `<title>Support — HyperQuote</title>`.

**This is a FUNCTIONAL page.**

**Two-tier system:**
- Anonymous visitors: contact form + FAQ.
- Logged-in users: ticket system + live chat (redirects to portal support).

**Layout:** Max-width 1024px centered. py-48px.

**Section 1 — Help heading:**
- "How can we help?" — Inter 700 30px, text-center.
- Search field: React Aria `SearchField`, max-width 600px, centered, height 48px, rounded-xl. Placeholder: "Search help articles..." / "ابحث في مقالات المساعدة...". Filters FAQ list below on input (debounced 200ms, fuse.js).

**Section 2 — Contact options (3-card row, mt-48px):**
- 3 cards side by side (stack on mobile). Each card: bg `var(--color-card)`, rounded-xl, p-24px, border 1px `var(--color-border)`, text-center.
- Card 1 — WhatsApp (primary):
  - Icon: Lucide `MessageCircle` 32px `var(--color-success)`.
  - "WhatsApp" — Inter 600 18px.
  - "Fastest response. Available Sun-Thu, 8AM-6PM." — Inter 400 14px muted.
  - "Chat on WhatsApp" button: green (`var(--color-success)`) bg, white text, height 44px, full width, rounded-lg. On click: opens `https://wa.me/{number}`.
- Card 2 — Email:
  - Icon: Lucide `Mail` 32px `var(--color-primary)`.
  - "Email Us" — Inter 600 18px.
  - "Response within 4 hours." — Inter 400 14px muted.
  - "support@hyperquote.net" — Inter 500 14px `var(--color-primary)`. `mailto:` link.
- Card 3 — Phone:
  - Icon: Lucide `Phone` 32px `var(--color-primary)`.
  - "Call Us" — Inter 600 18px.
  - "Sun-Thu, 8AM-6PM (Cairo time)." — Inter 400 14px muted.
  - Phone number in Geist Mono 16px. `tel:` link.

**Section 3 — Contact form (anonymous visitors) or "Go to Portal" (logged in):**
- Heading: "Send us a message" — Inter 600 20px.
- **If NOT logged in:** Contact form (React Hook Form + Zod):
  - Name: React Aria `TextField`. Required. Max 100 chars. Validation: min 2 chars. Label: "Your Name". Height 44px.
  - Email: React Aria `TextField`, type email. Required. Validation: Zod `.email()`. Label: "Email Address".
  - Phone: React Aria `TextField`, type tel. Optional. Placeholder: "+20 1XX XXX XXXX". Validation: Egyptian phone regex `/^\+?20[0-9]{10}$/` or international format.
  - Subject: React Aria `Select`. Options: "General Inquiry", "Product Question", "Quote Help", "Partnership", "Other". Required. Label: "Subject".
  - Message: React Aria `TextArea`. Required. Min 10 chars, max 2000 chars. 4 rows min. Label: "Message". Character count in bottom-right: Geist Mono 11px `var(--color-text-subtle)`, format: "42/2000".
  - "Send Message" button: blue bg, white text, full width max 400px, height 48px, rounded-lg. Disabled until form valid (opacity 0.5). On click:
    - Button text changes to "Sending..." with no spinner (just text swap).
    - POST to server function.
    - On success: form clears, success toast "Message sent! We'll get back to you within 4 hours." Form area shows a confirmation: Lucide `CheckCircle` 32px `var(--color-success)` + "Thank you! We've received your message." + "Expect a response within 4 hours." + "Send another message" link to reset form.
    - On error: error toast "Failed to send message. Please try again." Button re-enables.
  - All field errors shown inline below the field: Inter 400 12px `var(--color-error)`. Error border: 1.5px `var(--color-error)` on the field.
- **If logged in:** "For faster support, use your portal dashboard." + "Go to Portal Support" button (blue, links to `portal.hyperquote.net/support`). Contact form still available below as fallback.

**Section 4 — FAQ (mt-64px):**
- Heading: "Frequently Asked Questions" — Inter 600 20px.
- Accordion: React Aria `Disclosure` group. 10-15 FAQ items.
- Each item: border-bottom 1px `var(--color-border)`. py-16px.
  - Question: Inter 500 16px `var(--color-text)`. Full row is clickable. Lucide `ChevronDown` 16px at inline-end, rotates 180deg when open (CSS transition 200ms).
  - Answer: Inter 400 14px `var(--color-text-muted)`, line-height 1.75. pt-8px. Hidden when collapsed (height 0, overflow hidden, CSS transition 200ms). May contain links in `var(--color-primary)`.
- Search from Section 1 filters FAQ items — non-matching items fade to opacity 0.3 and get `aria-hidden`.

**Loading state:** FAQ skeletons (6 items: line + expanded area shimmer). Contact form skeleton (5 field skeletons).

**Mobile:** Contact cards stack vertically. Form is full width. FAQ is full width.

**RTL/Arabic:** Chevron icons flip. Form labels align inline-start. Character count position stays bottom-end. All labels, options, placeholder text translated.

---

### 1.7 Legal Pages

**Routes:** `/legal/privacy`, `/legal/terms`
**Rendering:** SSG. Content from `essential/brand/legal/` markdown files.

**Layout:** Max-width 800px centered (reading width). py-48px.

**Content:**
- Title: Inter 700 30px. e.g., "Privacy Policy" / "سياسة الخصوصية".
- Last updated date: Geist Mono 12px `var(--color-text-muted)`. "Last updated: March 2026".
- Body: Rendered markdown. Headings (h2): Inter 600 20px, mt-32px mb-16px. Headings (h3): Inter 600 16px, mt-24px mb-12px. Paragraphs: Inter 400 16px, line-height 1.75, mb-16px. Lists: pl-24px (ps-24px logical). Links: `var(--color-primary)`, underlined.
- Language toggle for legal: both Arabic and English versions available. Toggle at top: "العربية | English" — switches between `/legal/privacy?lang=ar` and `/legal/privacy?lang=en`. Arabic version is legally binding; English is a convenience translation. A notice at the top of the English version: "This is a translation. The Arabic version is the legally binding document." in a blue info banner (`var(--color-info-bg)` background, `var(--color-info)` text, rounded-lg, p-12px, Lucide `Info` 16px inline).

**Mobile / RTL:** Content reflows naturally. Reading width becomes full width with px-16px.

---

### 1.8 Docs Page (Skeleton)

**Route:** `/docs`, `/docs/{section-slug}`
**Rendering:** SSG.
**Meta:** `<title>Documentation — HyperQuote</title>`.

**Layout:** 2-column. Sidebar navigation (inline-start, 256px) + content area (remaining width). Max-width 1280px.

**Sidebar:**
- Sticky, top 80px. Background: `var(--color-surface)`. Rounded-xl on desktop (no border on mobile).
- Navigation tree: React Aria `ListBox` with sections. Each section heading: Inter 600 12px `var(--color-text-subtle)`, uppercase, mb-8px. Each link: Inter 400 14px `var(--color-text-muted)`. Active: `var(--color-primary)`, font-weight 500, with a 2px inline-start border blue.
- Sections (skeleton — 2-3 example sections):
  - "Getting Started": "What is HyperQuote?", "Creating an Account", "Your First Quote"
  - "Using the Portal": "Building Material Lists", "Tracking Orders", "Managing Projects"
  - "For Suppliers": "Publishing Your Catalog", "Managing Prices", "Handling POs"
- Mobile: sidebar collapses. A "Docs Menu" button (same as mobile filter pattern) opens bottom sheet with navigation.

**Content area:**
- Prose styling identical to legal pages.
- Table of contents (on-page): right sidebar (inline-end, 200px) on wide screens (> 1440px). Lists h2/h3 anchors. Active section highlighted via IntersectionObserver. Inter 400 12px.
- Placeholder content for skeleton sections. Each section: heading + 2-3 paragraphs of lorem ipsum equivalent describing the feature in general terms + a placeholder image area (rounded-xl, `var(--color-surface)`, 100% width, aspect ratio 16:9, centered text "Screenshot coming soon" Inter 400 14px muted).

**Mobile / RTL:** Sidebar becomes bottom sheet. ToC hidden. Content full width.

---

### 1.9 Login Modal

**Not a page — a modal overlay triggered from any page on the website.**

**Trigger conditions:**
- "Get a Quote" CTA click (header or body) when not logged in.
- "Add to Quote" click on product when not logged in.
- Direct navigation to portal features that require auth.

**Modal container:**
- React Aria `Modal` + `ModalOverlay`. `isDismissable={true}`.
- Overlay: black at 50% opacity, `backdrop-filter: blur(4px)`. Tween fade-in 200ms.
- Modal: `var(--color-card)` background, rounded-2xl (16px), max-width 440px, centered vertically and horizontally. Shadow-xl. Spring enter (scale 0.95 → 1, opacity 0 → 1, stiffness 260, damping 20). Tween exit (opacity 1 → 0, 150ms).
- Close button: top inline-end corner. Lucide `X` 20px, 36px square touch target, `var(--color-text-muted)`. Hover: `var(--color-text)`. Also closeable via Escape key (handled by React Aria, not hotkeys library).
- Focus trapped inside modal. First focusable element receives focus on open.

**Content — Progressive Signup Stage 1 (4 fields):**

**Step 1 — Phone number:**
- Heading: "Sign In" / "تسجيل الدخول" — Inter 700 24px, text-center, mb-8px.
- Subheading: "Enter your phone number to continue" — Inter 400 14px `var(--color-text-muted)`, text-center, mb-24px.
- Country code: fixed "+20" with Egyptian flag emoji, shown as a non-editable prefix inside the phone input. Background `var(--color-surface)`, pe-8px, border-end 1px `var(--color-border)`.
- Phone input: React Aria `TextField`, type tel. Placeholder: "1XX XXX XXXX". Height 48px. Full width. Geist Mono for the number. Auto-focus on modal open. Validation: 10 digits after country code, must start with 10/11/12/15.
- "Continue with WhatsApp" button: full width, green (`var(--color-success)`) bg, white text, Inter 600 14px, height 48px, rounded-lg. Lucide `MessageCircle` 20px inline-start. Disabled until phone is valid.
  - On click: POST to server function `sendOTP({ phone, method: 'whatsapp' })`. Button shows "Sending..." text (no spinner). On success: transitions to Step 2.
  - On error (rate limit): "Too many attempts. Please wait {X} seconds." — error message below button in Inter 400 12px `var(--color-error)`.
- Below: "Send via SMS instead" link — Inter 400 12px `var(--color-text-muted)`. On click: sends OTP via SMS fallback. Changes link text to "Sent via SMS" with checkmark.

**Step 2 — OTP verification:**
- Heading: "Verify Your Number" / "تأكيد رقمك" — Inter 700 24px.
- "We sent a code to +20 1XX XXX XXXX" — Inter 400 14px `var(--color-text-muted)`. Phone number in Geist Mono.
- OTP input: 6 individual digit boxes (React Aria `TextField` each, type tel, maxlength 1, inputmode numeric). Each box: 48px square, rounded-lg, border 1px `var(--color-border)`, text-center, Geist Mono 20px. Auto-advance focus to next box on input. Backspace moves to previous box. Paste support: pasting 6 digits fills all boxes.
  - On all 6 digits entered: auto-submit (no button press needed). Show brief "Verifying..." state.
  - On success — existing user: close modal, set SSO cookie, refresh page data. Toast: "Welcome back, {name}!".
  - On success — new phone (no account): transition to Step 3.
  - On failure (wrong code): boxes shake animation (CSS `@keyframes`, translateX -4px/4px, 3 cycles, 200ms). Clear all boxes. Error text: "Invalid code. Please try again." `var(--color-error)`.
- "Resend code" link: appears after 30s countdown. Countdown shown in Geist Mono 14px `var(--color-text-muted)`: "Resend in 0:28". After countdown: "Resend code" becomes active (Inter 500 14px `var(--color-primary)`). On click: resends, resets countdown.
- "Change number" link: Inter 400 12px `var(--color-text-muted)`. Returns to Step 1.

**Step 3 — Account creation (new users only):**
- Heading: "Create Your Account" / "إنشاء حسابك" — Inter 700 24px.
- Company name: React Aria `TextField`. Required. Placeholder: "Your company name" / "اسم شركتك". Height 44px. Max 200 chars.
- Full name: React Aria `TextField`. Required. Placeholder: "Your full name" / "اسمك الكامل". Height 44px. Max 100 chars.
- "Create Account" button: full width, blue bg, white text, height 48px, rounded-lg. Disabled until both fields have >= 2 chars.
  - On click: POST `createAccount({ phone, company, name })`. On success: set SSO cookie, close modal. Toast: "Welcome to HyperQuote, {name}!". If trigger was "Get a Quote", redirect to `portal.hyperquote.net/orders?action=new-quote`. If trigger was "Add to Quote", complete the add-to-quote action.
  - On error: error message below button.
- Below button: "By creating an account, you agree to our [Terms of Use] and [Privacy Policy]." — Inter 400 11px `var(--color-text-subtle)`. Links are `var(--color-primary)`, open in new tab.

**Account claiming (phone matches unclaimed customer record):**
- After OTP verification in Step 2, if the phone matches an unclaimed `customers` record:
- Additional screen before Step 3: "We found an existing account" — Inter 600 18px.
- Masked company hint: "A**** C****" — Inter 500 16px `var(--color-text)` (first letter + masked rest).
- "Is this your company?" — Inter 400 14px `var(--color-text-muted)`.
- Two buttons:
  - "Yes, that's me" (blue, full width, 44px): claims the account, links auth user to existing customer record. Skips Step 3 entirely. Toast: "Welcome! Your order history is now available."
  - "No, create a new account" (outline, full width, 44px): proceeds to Step 3 as normal.

**RTL/Arabic:** All text aligns naturally. Phone input direction stays LTR (numbers). OTP boxes stay LTR order. Labels and buttons translated.

---

### 1.10 Careers Page

**Route:** `/careers`
**Rendering:** SSG.
**Meta:** `<title>Careers — HyperQuote</title>`.

**Layout:** Max-width 800px centered. py-48px. Minimal page.

**Content:**
- Heading: "Join Our Team" — Inter 700 30px.
- Intro paragraph: Inter 400 16px, 2-3 sentences about the company culture.
- Job listings: if positions exist, each as a card: bg `var(--color-card)`, rounded-xl, p-24px, mb-16px, border 1px `var(--color-border)`.
  - Title: Inter 600 18px. Department: badge (same style as product category badge). Location: Inter 400 14px muted (e.g., "Cairo, Egypt · Full Time").
  - Brief description: Inter 400 14px, 2-3 lines.
  - "Apply" button: blue outline, height 40px, px-20px. On click: opens `mailto:careers@hyperquote.net?subject=Application: {Job Title}`.
- If no positions: "We're always looking for talented people." + "Send us your CV" email link.

---

### 1.11 AI Chat Widget (Website — Floating Button)

**Present on ALL website pages. Floating in bottom-right (bottom-left in RTL).**

**Collapsed state (default):**
- Floating action button: 56px circle, `var(--color-primary)` background, white Lucide `MessageSquare` 24px icon. Shadow-lg. Position: fixed, bottom 24px, inline-end 24px. z-index 50.
- Hover: `scale(1.05)`, shadow-xl.
- Pulse badge: if the chat has an unread suggestion (first-time visitors), a small green dot (10px) at top-right of the button, with a single pulse animation on mount (not continuous).
- On click: opens chat panel (spring enter).

**Expanded state:**
- Panel: 380px width, 520px max-height (or 80vh, whichever is smaller). Position: fixed, bottom 24px, inline-end 24px. `var(--color-card)` background, rounded-2xl, shadow-2xl, border 1px `var(--color-border)`. Overflow hidden.
- Header bar: height 48px, px-16px. `var(--color-surface)` background. Flex row, items-center.
  - Left: LyonBlack/White SVG 20px height + "HyperQuote" Inter 600 14px.
  - Right: Close button — Lucide `X` 20px, 32px touch target.
- Chat area: flex-1, overflow-y auto, p-16px. Scroll anchored to bottom.
  - First message (auto, on open for new visitors): "Hi! I can help you find building materials or get a quote. What are you looking for?" — appears as an AI bubble.
  - AI bubbles: `var(--color-surface)` background, rounded-xl, rounded-tl-sm (rounded-tr-sm in RTL). Max-width 80%. p-12px. Inter 400 14px.
  - User bubbles: `var(--color-primary)` background, white text, rounded-xl, rounded-tr-sm (rounded-tl-sm in RTL). Max-width 80%. p-12px. Inter 400 14px. Aligned to inline-end.
  - Typing indicator: 3 dots bouncing (CSS animation). Shown while AI is streaming response.
  - AI responses stream word-by-word via SSE (@tanstack/ai-react `useChat`).
- Input area: bottom of panel. Border-top 1px `var(--color-border)`. px-12px py-8px. Flex row, gap 8px.
  - Text input: React Aria `TextField`. Flex-1. Height: auto (grows with content, max 3 lines). Placeholder: "Type your message..." / "اكتب رسالتك...". No border (borderless input within the bordered panel).
  - Send button: 36px square, `var(--color-primary)` bg, white Lucide `Send` 16px (flipped 180deg in RTL). Rounded-lg. Disabled when input empty (opacity 0.3). On click or Enter: sends message.
- Actions: AI can suggest actions inline. Example: after "I need cement", AI responds with product details and an inline "Add to Quote" button (blue outline, 32px height, within the message bubble). Button behavior same as catalog "Add to Quote".

**Not-logged-in behavior:** Chat works for general questions. If user requests a quote action via chat, AI responds: "I'd love to help with that! Please sign in first." with an inline "Sign In" button that opens the Login Modal.

**Mobile:** Panel becomes full-screen bottom sheet (100vw, 70vh). Slides up from bottom. Close button at top-right. Input has 56px height for touch targets.

---


> **Implementation:** TanStack Start SSR/SPA | Deploy: Cloudflare Workers | Auth: Supabase SSR (SSO cookie on `.hyperquote.net`) | PWA
> **Key packages:** react-aria-components, motion, zustand, @tanstack/ai-react, fuse.js, react-hook-form, zod
> **Shared packages:** @hyperquote/ui, @hyperquote/auth, @hyperquote/i18n, @hyperquote/forms, @hyperquote/tables

## APP 2: PORTAL (portal.hyperquote.net)

**Architecture:** TanStack Start, SSR on Cloudflare Workers. PWA (install prompt after 3rd visit).
**Purpose:** Customer + Supplier portal. AI-centered interaction. Material list builder, quote management, order tracking, documents, support. Supplier view: stock publishing, pricing, PO inbox, invoicing, analytics.
**Auth:** Required for all access. SSO cookie on `.hyperquote.net` — login on website = logged in on portal.
**Design:** Spatial glass philosophy. AI chat centered. Glass windows for domains. NOT a traditional dashboard.
**Font base:** 14px (portal standard).

### 2.1 Authentication Gate

**When unauthenticated user visits any portal route:**
- Check SSO cookie in `beforeLoad` route guard (server-side, zero flash).
- If no valid session: redirect to `hyperquote.net?login=portal&redirect={encoded_path}`. Website opens Login Modal automatically (reads `login` query param). After auth: redirect back to the original portal URL.
- If valid session but user has no portal access (e.g., internal-only employee): show a centered error page: "You don't have access to the customer portal." + "Go to Internal App" button if they have internal access, or "Contact Support" otherwise.

---

### 2.2 Portal Shell — Spatial Layout (Authenticated)

**The portal IS the spatial philosophy. No sidebar. No top nav. No traditional page chrome.**

**Base canvas:**
- Full viewport. Background: `var(--color-base)` (white in light mode, near-black in dark mode). Completely empty — no gradients, no patterns, no decoration. The emptiness IS the design.
- PWA install prompt: after 3rd visit (tracked in localStorage), a subtle banner appears at the bottom: `var(--color-card)` bg, rounded-xl, shadow-md, max-width 400px, centered horizontally, mb-16px from viewport bottom. Content: HyperQuote icon 24px + "Install HyperQuote for quick access" Inter 400 14px + "Install" button (blue, 32px height) + close (Lucide `X` 16px). Dismissible. Once dismissed or installed, never shows again.

**Welcome greeting (canvas center, above AI chat):**
- On load (spring animation, opacity 0 → 1, 200ms):
  - Greeting: "Good morning, Ahmed" / "صباح الخير، أحمد" — Inter 600 20px `var(--color-text)`. Time-aware greeting: "Good morning" (5AM-12PM), "Good afternoon" (12PM-5PM), "Good evening" (5PM-10PM), "Good night" (10PM-5AM). Arabic equivalents: صباح الخير, مساء الخير, مساء الخير, تصبح على خير.
  - If urgent items exist: "3 items need your attention" — Inter 400 14px `var(--color-text-muted)`, mt-4px. Lucide `AlertCircle` 14px `var(--color-warning)` inline-start. Items that count: quotes awaiting response, orders with status changes, overdue actions.
  - Greeting fades after 3 seconds (tween, opacity 1 → 0.4, stays at 0.4 — does not disappear completely; it becomes background context).

**AI Chat — centered, primary interaction (below greeting):**
- Position: centered horizontally, vertically positioned at ~40% from top of viewport.
- Chat container: max-width 640px, full height grows downward as conversation progresses.
- Input field (primary, always visible): height 56px, rounded-2xl (16px), border 1px `var(--color-border)`, bg `var(--color-card)`, shadow-sm. px-20px.
  - Placeholder text rotates every 8 seconds (CSS opacity crossfade): "What do you need today?" → "Try: I need 500 bags of cement" → "Try: Reorder my last purchase" → "Try: What's the status of my order?" / Arabic equivalents.
  - Lucide `Sparkles` 20px at inline-start, `var(--color-primary)` at 50% opacity.
  - Send button at inline-end: 40px circle, `var(--color-primary)` bg, white Lucide `ArrowUp` 18px. Opacity 0.3 when empty, 1.0 when input has text.
  - On focus: border becomes `var(--color-primary)` 1.5px, shadow-md with blue tint (`0 0 0 3px rgba(37,99,235,0.1)`). Input placeholder stops rotating, shows single placeholder.
  - On Enter or send click: message appears as user bubble, AI begins streaming response.

**Chat message area (grows above input as conversation progresses):**
- Appears between greeting and input. Max-height: 60vh. Overflow-y: auto. Smooth scroll.
- User messages: `var(--color-primary)` bg, white text, rounded-2xl, rounded-br-md (rounded-bl-md in RTL). Max-width 80%. p-12px 16px. Inter 400 14px. Aligned inline-end.
- AI messages: `var(--color-card)` bg, border 1px `var(--color-border)`, rounded-2xl, rounded-bl-md (rounded-br-md in RTL). Max-width 85%. p-16px. Inter 400 14px. `var(--color-text)`.
  - AI messages can contain:
    - Plain text.
    - Product cards (compact: image 48px, name, price range, "Add to Quote" button).
    - Material list preview (table format with items, quantities, option to "Edit List" or "Submit as Quote").
    - Order status card (order number in Geist Mono, status badge with semantic color, key dates).
    - Action buttons: inline buttons (blue outline, 32px height) that trigger portal actions.
  - Streaming: text appears word-by-word. Structured content (cards, tables) appears after streaming completes with spring animation.
- Typing indicator: "HyperQuote is thinking..." — Inter 400 12px `var(--color-text-muted)`, with 3-dot animation, below the last AI message.
- Cancellation: while AI is streaming, the send button becomes a stop button (Lucide `Square` 14px, red tint). Click aborts the stream via AbortController.

**Navigation buttons (below chat input, mt-24px):**
- Two glass-style buttons side by side, gap 16px:
  - "Orders" button: Glass card — bg `var(--color-card)` with `backdrop-filter: blur(8px)` and 60% opacity border. Width: 50% of chat container (max 300px each). Height 64px. Rounded-2xl. p-16px. Flex row, items-center, gap-12px.
    - Lucide `ShoppingBag` 24px `var(--color-primary)`.
    - "Orders" — Inter 600 16px `var(--color-text)`.
    - Badge (if active items): Geist Mono 12px, white text on `var(--color-primary)` bg, rounded-full, min-width 20px, height 20px, text-center. Shows count of active quotes + orders.
    - Hover: `translateY(-2px)`, shadow-lg, border opacity increases. 150ms ease.
    - On click: Opens the Orders glass window (2.4).
  - "Market" button: same glass card style.
    - Lucide `Store` 24px `var(--color-primary)`.
    - "Market" — Inter 600 16px.
    - No badge.
    - On click: Opens the Market glass window (2.5).
- Mobile: buttons stack vertically if viewport < 480px, full width each.

**Supplier role toggle (visible only for users with supplier role):**
- Positioned at top-right (top-left in RTL) of viewport, 16px from edge, 16px from top.
- Toggle: React Aria `ToggleButton`. Pill shape, 120px width, 36px height, rounded-full.
  - Customer mode (default): "Customer" label, `var(--color-card)` bg, `var(--color-text)` text.
  - Supplier mode: "Supplier" label, `var(--color-primary)` bg, white text.
  - Transition: background slides (CSS, 200ms).
- When toggled to Supplier:
  - Greeting updates: still shows name.
  - Navigation buttons change to supplier windows (2.10-2.14).
  - AI chat context switches to supplier mode (different prompts, different data access).
  - URL updates to `/supplier` prefix (e.g., `/supplier` base).

**Role switch behavior (detailed):**
- The toggle is a React Aria `ToggleButtonGroup` (not a single ToggleButton) with two segments: `[Customer]` and `[Supplier]`. Pill-shaped container, 200px total width, 36px height, rounded-full.
- Active segment: `var(--color-primary)` bg, white text (Inter 500 13px). Inactive segment: transparent bg, `var(--color-text-muted)` text. Sliding indicator (CSS transition, 200ms).
- On switch: all open windows close (tween exit, 150ms). Canvas resets with crossfade (200ms). Navigation buttons change — Customer mode: "Orders" + "Market". Supplier mode: "Stock" (Lucide `Package`) + "Purchase Orders" (Lucide `ClipboardList`).
- Both roles operate in the same authenticated session. No page reload. Zustand store holds `activeRole: 'customer' | 'supplier'`. TanStack Query caches are keyed by role — switching roles does not refetch if cache is warm.
- URL updates: `/` for customer root, `/supplier` for supplier root. Deep links respect role: `/supplier/stock` opens supplier mode directly.
- AI chat context resets on switch (new conversation, different system prompt, different data access). Previous conversation per role is preserved in Zustand (keyed by role) and restored on switch-back within the same session.

**Settings / Profile (top inline-end cluster):**
- Notification bell: Lucide `Bell` 20px, 40px touch target. If unread notifications: blue dot (8px) at top-right of icon. On click: opens Notifications window (glass panel, 2.8).
- Profile avatar: 32px circle. If photo: object-cover. If no photo: initials on `var(--color-primary)` bg, white, Inter 600 12px. On click: opens a popover (React Aria `Popover`, CSS transition):
  - User name: Inter 600 14px.
  - Company: Inter 400 12px `var(--color-text-muted)`.
  - Divider.
  - Menu items (React Aria `Menu`): "Settings" (Lucide `Settings`), "Documents" (Lucide `FileText`), "Support" (Lucide `HelpCircle`), "Language: EN/AR" (Lucide `Languages`), "Theme" (Lucide `Sun`/`Moon`), divider, "Sign Out" (Lucide `LogOut`, `var(--color-error)` text).
  - Each item: height 40px, px-12px, Inter 400 14px. Hover: `var(--color-surface)` bg.
  - "Sign Out": confirmation required. On click: shows inline "Are you sure?" with "Cancel" and "Sign Out" buttons (red text). On confirm: POST to sign-out server function, clear SSO cookie, redirect to `hyperquote.net`.

**Glass window behavior (universal pattern for all portal windows):**
- When any window opens (Orders, Market, Notifications, etc.):
  - Canvas elements (greeting, chat, buttons) scale down to 0.96 and blur slightly (`filter: blur(2px)`, opacity 0.5). Tween 300ms.
  - Window slides in: spring animation (opacity 0 → 1, scale 0.98 → 1, stiffness 200, damping 20).
  - Window: max-width 1200px, max-height 90vh, centered. `var(--color-card)` bg with `backdrop-filter: blur(16px)` and 85% opacity. Rounded-3xl (24px). Shadow-2xl. Border 1px `var(--color-border)` at 50% opacity. Overflow hidden.
  - Header bar inside window: height 56px, px-24px. Border-bottom 1px `var(--color-border)`. Flex row, items-center.
    - Left: Window title (Inter 600 18px) + optional subtitle (Inter 400 13px muted).
    - Right: Close button — Lucide `X` 24px, 44px touch target. `var(--color-text-muted)`, hover `var(--color-text)`.
  - Content area: flex-1, overflow-y auto. p-24px (desktop), p-16px (mobile).
  - Escape key: closes window (handled via React Aria Modal `isKeyboardDismissDisabled={false}`). Returns to canvas.
  - Click outside window (on dimmed canvas): closes window.
- When window closes: tween animation (opacity 1 → 0, 150ms). Canvas elements restore (scale 1, blur 0, opacity 1). Tween 200ms.
- Deep linking: each window has a URL route. Opening Orders → URL becomes `/orders`. Closing → URL becomes `/`. Browser back button closes the window.

**Elevated layer (modals over windows):**
- Confirmation dialogs, command palette, and other overlays that appear OVER an open glass window.
- Stronger glass effect: `backdrop-filter: blur(24px)`, 90% opacity, shadow-3xl. Rounded-2xl.
- Overlay behind elevated: black at 40% opacity.
- Focus trapped. Escape closes elevated layer (window remains open).

**Mobile adaptation (< 768px):**
- Canvas: greeting and AI chat take full width with px-16px. Navigation buttons stack vertically, full width.
- Glass windows: full-screen (100vw, 100vh minus safe areas). No rounded corners. Slides up from bottom (spring). Close button at top-right. Back gesture (swipe right on iOS / back button on Android) closes window.
- Profile popover becomes a full-screen bottom sheet.
- Supplier toggle moves to inside profile menu (not floating).

**Keyboard shortcuts (portal-wide):**
- `/` — Focus AI chat input (when no input focused).
- `Escape` — Close topmost layer (elevated → window → nothing).
- `O` — Open Orders window (when no input focused and no window open).
- `M` — Open Market window (same conditions).
- `N` — Open Notifications (same conditions).
- All shortcuts fire only when no text input, textarea, or contenteditable is focused. Managed via @tanstack/react-hotkeys with `enabled` condition checking Zustand store for `activeInputElement === null`.
- Shortcut hints: shown as subtle `<kbd>` badges on buttons. "Orders [O]", "Market [M]". Desktop only, hidden on mobile.

**Floating AI button (persistent when windows are open):**
- When any glass window is open, a floating AI button appears in the bottom-right corner (bottom-left in RTL), 24px from edges.
- Button: 44px circle, `var(--color-primary)` bg, white Lucide `Sparkles` 20px. Shadow-lg. Spring entrance (scale 0 → 1, 200ms delay after window opens).
- Hover: scale 1.05, shadow-xl. 100ms ease.
- On click: mini AI chat opens as an Elevated glass panel — 380px width, 60vh max-height, anchored to the bottom-right corner (bottom-left in RTL). `backdrop-blur-2xl bg-white/90 dark:bg-black/90`, rounded-2xl, shadow-2xl. Contains: compact chat input (44px height) + scrollable message area + close button (Lucide `X` 16px).
- Context-aware: the AI greeting reflects the open window context. Examples: "I see you're looking at Order #847 — need help?" / "Browsing the market — want me to find something specific?"
- Auto-closes when the parent window closes (returns to the centered AI chat on canvas).
- Keyboard: `Ctrl+J` toggles the mini-chat from anywhere (even when a window is open). Same shortcut closes it.
- Mobile: floating button is 56px, positioned 16px from bottom-right (above any system navigation). Mini-chat becomes a bottom sheet (100vw, 50vh).

**Offline behavior:** Subtle top banner appears (same as website offline banner). Chat input disabled with placeholder "Chat unavailable offline". Orders window shows cached data with "Showing cached data" label. Market window shows cached products. Mutations disabled — add-to-quote, submit-quote buttons show tooltip "You're offline" on hover.

---

### 2.3 Portal — AI Chat Capabilities (Detailed)

**The AI chat is the PRIMARY interaction point. It replaces traditional navigation for users who prefer it.**

**Supported intents (customer mode):**

| Intent | Example Input | AI Response |
|--------|--------------|-------------|
| Product search | "Do you have portland cement?" | Product card(s) with specs, price range, availability. "Add to Quote" inline button. |
| Simple order | "I need 500 bags of OPC cement and 200 bundles of 12mm rebar" | Parses into structured material list. Shows editable table. "Submit as Quote Request" button. |
| Reorder | "Reorder my last purchase" or "Reorder what I got in January" | Pulls previous order, shows items as editable list. "Submit as Quote Request" button. |
| AI estimation | "I'm building a 3-floor apartment, 200sqm per floor. What materials do I need?" | Asks clarifying questions (foundation type, finish level). Generates material list with DISCLAIMER: "This is an estimate. Verify with your engineer before ordering." Shows as editable list. |
| Order status | "Where's my order?" or "Status of QR-2026-00042" | Order status card with timeline, current stage, ETA if applicable. Link to open full order in Orders window. |
| Invoice lookup | "Show me my invoices" or "Do I have any unpaid invoices?" | List of recent invoices with status badges. Amounts in Geist Mono. Link to Documents window. |
| Quote status | "Any updates on my cement quote?" | Quote status with timeline. If pending: "Your quote is being prepared. Expected by {time}." |
| Support | "I received damaged cement" or "I need help" | Creates support ticket. Asks for details + photo upload. Or redirects to WhatsApp with pre-filled context. |
| General | "What are your delivery areas?" or "Do you deliver to Aswan?" | Informational response from knowledge base. |

**AI guardrails:**
- Never reveals exact supplier prices, margin data, or internal cost information.
- Estimation tool always includes disclaimer text. User must acknowledge before submitting as quote.
- Large quantity flag: if user requests quantity significantly above normal (AI checks historical norms), AI asks "That's a large quantity of {item}. Just confirming — you need {X} {unit}?"
- All AI-drafted material lists are EDITABLE before submission. User can add, remove, change quantities.
- AI never auto-submits anything. Every action requires explicit user confirmation.

**Rich message types (AI responses can contain inline):**
- Text (markdown rendered)
- Product cards: image, name, specs, price range, "Add to Quote" button
- Price comparison tables: formatted tabular data
- Status cards: mini order tracker with timeline
- Action buttons: "Create Quote", "Track Order #847", "View Invoice"
- Inline forms: structured field entry for complex requests
- File attachments: PDFs, images with preview

**Quick action chips (below input, contextual):**
- Home state: "Get a quote" | "Track my order" | "Check prices" | "Upload material list"
- After product discussion: "Add to quote" | "Check stock" | "See alternatives" | "Compare prices"
- Chips change based on conversation stage. Reduce typing, show AI capabilities.

**Input design:**
- Multi-line text input (1 line default, auto-expand to max 6 before scroll)
- File attachment button (Lucide `Paperclip`): upload images, PDFs, CSVs, Excel
- Voice input button (Lucide `Mic`, mobile): voice transcription
- Send button: Enter to send, Shift+Enter for new line
- Slash commands: `/quote`, `/track`, `/price`, `/help` — trigger command palette with autocomplete

**Conversation history (accessed via Lucide `History` icon button above chat input, NOT a persistent sidebar):**
- Opens as an Elevated glass overlay (not a sidebar — preserves spatial philosophy).
- Grouped by date: "Today", "Yesterday", "This Week", month names.
- Each thread: first message preview + key entity (Quote #, Order #).
- Pin important conversations. Search across all conversations.
- Click thread to resume (overlay closes, chat loads thread). Conversations persistent and resumable.
- On mobile: full-screen overlay with back button.

**AI streaming UI:**
- Uses @tanstack/ai-react `useChat()` hook.
- SSE connection to server function which proxies to Claude via Cloudflare AI Gateway.
- Conversation stored in Zustand (sessionStorage persist). Survives page refresh within session.
- Conversation history sent with each request (sliding window, last 20 messages) for context.
- Rate limit: 30 messages per minute. If exceeded: "You're sending messages too quickly. Please wait a moment." `var(--color-warning)`.

---

### 2.4 Orders Window (Customer View)

**URL:** `/orders`
**Glass window opens over canvas.**

**Window header:**
- Title: "Orders" — Inter 600 18px.
- Right side: "New Quote Request" button — blue bg, white text, Inter 500 14px, height 36px, px-16px, rounded-lg. Lucide `Plus` 16px inline-start. On click: opens the Material List Builder sub-view (2.6) within this window.

**Tab bar (below header, border-bottom):**
- React Aria `Tabs`. 4 tabs: "Active" (default), "Quotes", "History", "Drafts".
- Each tab: Inter 500 14px. Inactive: `var(--color-text-muted)`. Active: `var(--color-text)` + 2px bottom border `var(--color-primary)`. px-16px, height 44px.
- Tab counts in Geist Mono 12px within badges: "Active (3)", "Quotes (1)", "Drafts (2)".
- Tab content animates on switch: crossfade (tween 150ms).

**Active tab — shows orders in progress + quotes awaiting response:**
- List of cards, sorted by most recent activity first.
- Each order/quote card:
  - Background: `var(--color-base)` (slight contrast from window bg). Rounded-xl. p-16px. mb-12px. Border 1px `var(--color-border)`.
  - Top row: Reference number (Geist Mono 14px `var(--color-primary)`, e.g., "QR-2026-00042") + status badge (semantic color bg + text, rounded-sm, px-6px py-2px, Inter 500 11px).
    - Status badges: "Draft" (muted gray), "Submitted" (blue/info), "Quote Ready" (blue), "Negotiating" (yellow/warning), "Accepted" (green/success), "Order Confirmed" (green), "Being Prepared" (blue), "Out for Delivery" (blue), "Delivered" (green), "Expired" (red/error), "Cancelled" (red).
  - Second row: Brief description — "5 items · Cement, Rebar, Plywood" — Inter 400 13px `var(--color-text-muted)`. Item count in Geist Mono.
  - Third row: Date (Geist Mono 12px `var(--color-text-subtle)`) + amount if available (Geist Mono 14px `var(--color-text)`, e.g., "EGP 245,000").
  - Right side (inline-end): Lucide `ChevronRight` 16px `var(--color-text-muted)`. (Flips in RTL.)
  - Hover: border color `var(--color-primary)` at 30% opacity, `translateY(-1px)`. 150ms ease.
  - On click: navigates to order/quote detail view within the window (sub-route `/orders/{id}`).

**Quotes tab — all quotes regardless of status:**
- Same card layout as Active tab but shows all quotes including expired/declined.
- Filter chip bar at top: "All", "Pending", "Ready", "Negotiating", "Expired". React Aria `ToggleButton` group. Chips: height 32px, rounded-full, px-12px. Active: `var(--color-primary)` bg, white text. Inactive: `var(--color-surface)` bg, `var(--color-text-muted)`.

**History tab — completed and cancelled orders:**
- Same card layout. Date range filter: two React Aria `DatePicker` fields ("From" / "To") at the top. Default: last 90 days.
- "Reorder" button on each completed order card: blue outline, 32px height. On click: pre-fills Material List Builder with the order's items. User can edit before submitting.

**Drafts tab — saved but not submitted quote requests:**
- Same card layout. Draft cards show "Last edited: {date}" in Geist Mono 12px.
- Each draft card has: "Continue" button (blue, 36px) and "Delete" button (Lucide `Trash2` 16px, `var(--color-error)` on hover).
- Delete confirmation: elevated modal — "Delete this draft? This cannot be undone." + "Cancel" / "Delete" (red bg). On delete: tween fade-out of the card, success toast "Draft deleted."

**Loading state:** 4 skeleton cards — rectangle with 3 line placeholders each. Shimmer animation.

**Empty states (per tab):**
- Active: Lucide `Package` 48px `var(--color-text-subtle)`. "No active orders" Inter 600 16px. "Create a quote request to get started." Inter 400 14px muted. "New Quote Request" button (blue, 40px).
- Quotes: "No quotes yet." + "New Quote Request" button.
- History: "No order history." + "Your completed orders will appear here." text only.
- Drafts: "No drafts." + "Start building a material list." button.

**Error state:** Inline error card — Lucide `AlertTriangle` + "Failed to load orders" + "Retry" button.

**Mobile:** Window is full-screen. Cards are full width. Tab bar scrolls horizontally if needed. Tap card to see detail (pushes full-screen detail view).

**RTL/Arabic:** Cards read naturally. Chevrons flip. Dates use locale format. Currency uses Arabic format with ج.م suffix. Status badge text translated.

---

### 2.5 Market Window (Customer View — Browse Catalog)

**URL:** `/market`
**Glass window opens over canvas.**

**Functionally identical to the website Market page (1.4) but rendered inside a glass window instead of a full page.** Key differences:

- No website header/footer. Window header serves as the top bar.
- Window header: "Market" title + search field (inline, 240px width on desktop, full width on mobile).
- "Add to Quote" behavior: no login modal needed (user is already authenticated). Adds directly to active draft quote. If no draft exists, creates one silently. Toast: "{Product} added to your quote."
- Product detail: opens as a sub-view within the Market window (not a separate page). Back button (Lucide `ArrowLeft` / `ArrowRight` in RTL) in window header. URL: `/market/{product-slug}`.
- Filter sidebar: same behavior but constrained within window width. On narrow windows (< 1024px), becomes a filter button with bottom sheet.
- No pagination — infinite scroll instead (TanStack Query `useInfiniteQuery` with `maxPages: 5`). Scroll sentinel element at bottom triggers next page fetch. Loading: 2 skeleton cards appended to bottom.
- "Quick Add" mode: toggle in toolbar. When active, clicking any product shows a compact quantity popover immediately (no navigation to detail page). For power users who know what they want.

**All other specifications (search, filters, sort, cards, loading, empty, error states) match section 1.4.**

---

### 2.6 Material List Builder (Customer View)

**URL:** `/orders/new` (within Orders window)
**Accessed from:** "New Quote Request" button in Orders window, "Submit as Quote" from AI chat, "Reorder" from history.

**This is the core product action — building a list of materials to request a quote.**

**Layout within Orders window (replaces tab content):**
- Back button at top: "< Back to Orders" (Lucide `ArrowLeft` + text, Inter 500 14px `var(--color-text-muted)`). Returns to Orders tab view.
- Window header updates: title becomes "New Quote Request" with a step indicator.

**Step indicator (top, below header):**
- 3 steps: "Build List" → "Details" → "Review". Horizontal bar with circles.
- Each step: 24px circle with step number (Geist Mono 12px). Active: `var(--color-primary)` bg, white text. Completed: `var(--color-success)` bg, white Lucide `Check` 14px. Upcoming: `var(--color-border)` bg, `var(--color-text-muted)`.
- Connecting line between steps: 2px, `var(--color-primary)` for completed, `var(--color-border)` for upcoming.
- Step label below circle: Inter 500 12px.

**Step 1 — Build List:**

**Input methods (tab-like selector at top):**
- React Aria `Tabs`, compact. Options: "Search & Add" (default), "Upload", "Quick Pad", "AI Assist".
- Each tab: height 36px, Inter 500 13px. Same visual style as Orders tabs but compact.

**Method 1 — Search & Add (default):**
- Search field: full width, height 44px, React Aria `ComboBox` with `Autocomplete`. Placeholder: "Search for materials..." / "ابحث عن المواد...". Lucide `Search` 16px inline-start.
- As user types (debounced 150ms): dropdown of matching products. Each item in dropdown: product name (Inter 400 14px) + category badge + availability dot. Max 8 results visible, scrollable.
- On select: product added to the list below with default quantity 1. Focus moves to quantity field of the newly added item.
- Product list table:
  - Columns: "#" (row number, Geist Mono 12px), "Product" (name + SKU), "Qty" (editable NumberField), "UOM" (read-only label), "Notes" (optional TextField, compact), "Actions" (delete button).
  - Each row: height 52px. Border-bottom 1px `var(--color-border)`.
  - Quantity field: React Aria `NumberField`, 80px width, height 36px, Geist Mono. Min 1. Step varies by product UOM.
  - Notes field: React Aria `TextField`, 160px width, height 36px. Placeholder: "Optional notes". For specs like "Grade 43" or "OPC Type I".
  - Delete: Lucide `Trash2` 16px, `var(--color-text-muted)`, hover `var(--color-error)`. On click: row removed immediately (no confirmation for individual items). Tween fade-out.
  - Row drag handle (Lucide `GripVertical` 16px, `var(--color-text-subtle)`) at inline-start for reordering. Uses React Aria `useDrag`/`useDrop`.

**Method 2 — Upload:**
- Drag-and-drop zone: 200px height, border 2px dashed `var(--color-border)`, rounded-xl, centered content.
  - Lucide `Upload` 32px `var(--color-text-subtle)`.
  - "Drop your file here or click to browse" — Inter 400 14px `var(--color-text-muted)`.
  - "Supports: CSV, Excel (.xlsx), PDF" — Inter 400 12px `var(--color-text-subtle)`.
  - On file drop/select: file uploaded to server function for parsing.
  - Processing state: file icon + filename + spinning progress indicator (NOT a spinner — a progress bar, Geist Mono percentage). "Parsing your file..."
  - **Validation tiers (all errors shown at once, never fail on first error):**
    - Format validation: Is the quantity a number? Is the unit recognized?
    - Cross-field validation: Does quantity match unit type? (e.g., "5 tons" not "5 pieces" for cement)
    - Database validation: Does this SKU exist? Is this product still available?
  - Error table shows ALL errors: row number, field name, value found, what expected. Inline correction without re-upload.
  - Progress bar: "247 of 250 items validated successfully. 3 need attention."
  - `[Fix & Continue]` (edit in place) and `[Re-upload]` (start over) options.
  - On success: parsed items populate the product list table. Items the system couldn't match show a yellow warning badge "Unmatched — please verify" with a dropdown to manually select the correct product.
  - On failure: error message with retry. "Could not parse this file. Try CSV or Excel format."
  - Support messy real-world files: UTF-8 with/without BOM, auto-detect delimiters (comma/semicolon/tab), handle .xlsx renamed to .csv gracefully.
- "Download Template" link: below the drop zone. Downloads a CSV template with column headers (Product Name, SKU, Quantity, UOM, Notes).

**Method 3 — Quick Pad:**
- Spreadsheet-style grid optimized for power users who have a written list. 2 columns: SKU/name input (React Aria `ComboBox`, 60% width) + Quantity input (React Aria `NumberField`, 20% width) + UOM display (20% width, auto-populated).
- 10 empty rows shown by default. As user fills rows, more empty rows appear at bottom.
- Tab key advances: SKU → auto-populate product name/unit/stock → Qty → next row's SKU (skip auto-populated fields). Shift+Tab moves backward.
- Enter adds one item. Ctrl+Enter adds all valid items at once.
- Multi-SKU paste mode: paste one per line or tab/comma-separated from spreadsheet.
- Real-time SKU validation (300ms debounce). Invalid SKU: red border + inline error.
- Designed for users who have a written list and are typing fast.

**Method 4 — AI Assist:**
- Large textarea: React Aria `TextArea`, 6 rows, full width. Placeholder: "Describe what you need in your own words..." / "اكتب ما تحتاجه بكلماتك...".
- Example text (below textarea in `var(--color-text-subtle)` 12px): "Example: I need 500 bags of OPC cement 50kg, 200 bundles of 12mm rebar, and 100 sheets of 18mm plywood".
- "Parse with AI" button: blue bg, height 44px. Lucide `Sparkles` 16px inline-start.
  - On click: text sent to AI server function. Button shows "Parsing..." Parsed results populate the product list table (same as upload success). Unmatched items flagged.
  - AI can ask clarifying questions in a mini-chat inline: "Did you mean Egyptian or imported cement?" with option buttons.

**Project assignment (below product list):**
- React Aria `ComboBox` with create option. Label: "Project (optional)". Lists existing projects. User can type a new project name.
- If new name typed: "Create project: {name}" option appears at bottom of dropdown. On select: creates project.

**Item count and actions (bottom of step 1):**
- Left: "{N} items in your list" — Geist Mono for N, Inter 400 14px.
- "Save as Draft" button: outline, 40px height. Saves to drafts without submitting. Toast: "Draft saved."
- "Continue" button: blue bg, 44px height, px-24px. Disabled if list is empty. On click: validates all items have quantities >= 1. If validation fails: error highlight on invalid rows (red border). If valid: transitions to Step 2.

**Step 2 — Details:**
- Delivery address: React Aria `ComboBox`. Label: "Delivery Location". Lists saved addresses. Option to "Add New Address" which expands inline fields: Street, Area/District, City/Governorate (React Aria `Select` with all 27 Egyptian governorates), Landmark (optional), Phone at site (optional). All required fields except landmark and phone.
- **First-time behavior:** If the customer has zero saved delivery addresses (new account), the ComboBox is hidden and the "Add New Address" form auto-expands immediately. Header text changes to: "Add your delivery address" (Inter 600 16px). After the first address is saved, the ComboBox appears for all future orders with the newly created address pre-selected. This avoids showing an empty dropdown to first-time users.
- Preferred delivery date: React Aria `DatePicker`. Min date: tomorrow. Label: "Preferred Delivery Date". Geist Mono for date display. Calendar follows locale (Gregorian, Islamic calendar option in settings).
- Notes to HyperQuote: React Aria `TextArea`, 3 rows. Optional. "Any special requirements, access instructions, or delivery preferences."
- File attachments: dropzone for drawings/specs (PDF, images). Max 5 files, 10MB each. Shows uploaded files as chips (filename + Lucide `X` to remove).

**Step 2 validation:**
- Delivery address required.
- Delivery date required and must be a business day (not Friday/Saturday, not public holiday). If user picks Friday: inline error "Friday is not a delivery day. Please choose Sunday-Thursday."
- "Back" button (outline) returns to Step 1 (list preserved). "Continue" button advances to Step 3.

**Step 3 — Review & Submit:**
- Full summary displayed:
  - Item list (read-only table): Product, Qty, UOM, Notes. Geist Mono for all numeric columns.
  - Delivery details: address, date, notes.
  - Attached files listed.
  - Project name if assigned.
- "Edit" links next to each section (Lucide `Pencil` 14px + "Edit" text, `var(--color-primary)`). Clicking navigates back to the relevant step.
- **Important notice:** "Prices are not shown here. We'll prepare a quote for you." — in a blue info banner (`var(--color-info-bg)`, `var(--color-info)` text, rounded-lg, p-12px).
- "Submit Quote Request" button: full width max 400px, centered, blue bg, white text, Inter 600 16px, height 52px, rounded-xl. Shadow-sm. Disabled: false (enabled if review step reached).
  - On click: **Confirmation modal (elevated glass):**
    - "Submit quote request for {N} items?" — Inter 600 18px.
    - "We'll prepare your quote within 4 hours." — Inter 400 14px muted.
    - "Cancel" button (outline, 40px) + "Submit" button (blue, 40px).
    - On "Submit": POST to server function `submitQuoteRequest()`. Submit button shows "Submitting..." Skeleton loader replaces form.
    - On success: redirected to quote confirmation view:
      - Lucide `CheckCircle` 48px `var(--color-success)`. Spring animation.
      - "Quote Request Submitted!" — Inter 700 24px.
      - "Reference: QR-2026-{XXXXX}" — Geist Mono 16px `var(--color-primary)`.
      - "We'll have your quote ready within 4 hours. You'll receive a notification on WhatsApp." — Inter 400 14px muted.
      - "Track Quote" button (blue, 44px) — opens the quote in the Active tab.
      - "Back to Orders" link.
    - On error: error toast "Failed to submit. Please try again." Button re-enables.

**Loading states:** Step transitions show no loader (data is local). Submission: button loading text + skeleton. File upload: progress bar per file.

**Mobile:** Full-screen flow. Product list table becomes card layout (one card per item with stacked fields). Quick Pad shows one row at a time. Upload area larger (easier to tap). Step indicator is compact (numbers only, no labels).

**RTL/Arabic:** All form labels at inline-start. Table columns don't reorder (# always first, actions always last). Quantity inputs stay LTR for numbers. Date picker shows Arabic date names. All labels, placeholders, buttons translated. Error messages in current language.

---

### 2.7 Quote Detail & Response (Customer View)

**URL:** `/orders/{quote-id}`
**Accessed from:** Orders window card click, notification tap, AI chat link.

**Sub-view within Orders window.**

**Layout:**
- Back button: "< Back to Orders" at top.
- Quote header section:
  - Reference: Geist Mono 20px `var(--color-primary)`. "QR-2026-00042".
  - Status badge: large format (Inter 500 14px, px-10px py-4px, rounded-md). Semantic color.
  - Date submitted: Geist Mono 14px `var(--color-text-muted)`. "Submitted: 2026-03-28 at 14:32".
  - Validity period (if quote is ready): "Valid until: 2026-04-11" in Geist Mono 14px. If < 3 days remaining: `var(--color-warning)`. If expired: `var(--color-error)` + strikethrough.
  - Assigned rep: "Your account manager: Mariam Hassan" — Inter 400 14px. WhatsApp link icon.

**Quote timeline (left sidebar or top, depends on screen width):**
- Vertical timeline (desktop inline-start, 200px width) or horizontal (mobile, scrollable):
  - Each step: circle (12px) + label + date/time.
  - Completed steps: `var(--color-success)` circle with check. Label: Inter 400 12px `var(--color-text)`. Date: Geist Mono 11px `var(--color-text-muted)`.
  - Current step: `var(--color-primary)` circle, pulsing ring animation (CSS, subtle). Label: Inter 600 12px.
  - Future steps: `var(--color-border)` circle. Label: `var(--color-text-subtle)`.
  - Steps: "Submitted" → "Under Review" → "Sourcing" → "Quote Ready" → "Sent to You" → "Accepted/Negotiating" → "Order Confirmed".

**Quote content (when status is "Quote Ready" or "Sent"):**
- Line items table:
  - Columns: "#", "Product" (name bilingual), "Qty" (Geist Mono), "UOM", "Unit Price" (Geist Mono), "Line Total" (Geist Mono).
  - Unit price and line total: formatted with currency. "EGP 56.40" (EN) / "٥٦٫٤٠ ج.م" (AR).
  - Each row: height 48px. Alternating backgrounds.
  - If per-line counter-offer enabled: each row has a small "Counter" link (Inter 400 11px `var(--color-primary)`) that opens an inline edit field for the customer's counter-price.
- Subtotals section (below table):
  - Subtotal: Geist Mono 14px.
  - Delivery fee: as line item. If free: "(Free)" in `var(--color-success)`.
  - VAT (14%): Geist Mono 14px.
  - **Total (VAT inclusive):** Geist Mono 18px, Inter 700 for label. `var(--color-text)`.
  - All amounts right-aligned (end-aligned in logical terms).
- Payment terms: "50% advance + 50% COD by certified bank check" or "Net 30" etc. Inter 400 14px. Highlighted box: `var(--color-surface)` bg, rounded-lg, p-12px.
- Delivery details: address, estimated date, any surcharges.
- Price disclaimer: "Prices valid until {date}. Subject to supplier cost changes for volatile materials." Inter 400 12px `var(--color-text-muted)`, italic.

**Action buttons (when quote is actionable — status "Sent"):**
- Sticky bottom bar within window: bg `var(--color-card)`, border-top 1px, py-12px px-24px. Flex row, gap 12px.
  - "Accept Quote" — green (`var(--color-success)`) bg, white text, height 48px, flex-1 (larger), rounded-lg. Lucide `Check` 18px.
    - On click: **Confirmation modal (elevated):**
      - "Accept this quote?" — Inter 600 18px.
      - "Total: EGP {amount} (VAT inclusive)" — Geist Mono 16px.
      - "Payment terms: {terms}" — Inter 400 14px.
      - "This will create an order. You'll receive payment instructions." — Inter 400 13px muted.
      - "Cancel" + "Accept" (green).
      - On confirm: POST `acceptQuote()`. On success: status changes to "Order Confirmed". Celebration: brief confetti animation (subtle, 1 second, CSS particles). View updates to Order tracking (2.7b). Toast: "Order confirmed! Payment instructions sent to your WhatsApp."
  - "Counter-Offer" — yellow/warning outline, height 48px, px-24px, rounded-lg.
    - On click: opens counter-offer sub-view:
      - Options: "Counter on total" (single discount input — React Aria `NumberField`, suffix "%") OR "Counter per line" (enables inline price editing in the table above — click price cell → becomes input, changed cells highlight amber).
      - Floating "changes bar" at bottom of table: "{N} items modified" + `[Discard]` + `[Submit Counter-Offer]`. Updates in real-time as user edits prices.
      - Volume counter: "I'll order {X} instead of {Y}" with quantity fields that recalculate.
      - Delivery terms: checkbox "I'll arrange my own pickup (reduce price)".
      - Notes: TextArea for Arabic free-text negotiation notes.
      - "Submit Counter-Offer" button (blue, 44px). Confirmation modal: "Submit counter-offer? HyperQuote will review and respond." On submit: creates new quote version. Status changes to "Negotiating". Toast: "Counter-offer submitted."
  - "Partial Accept" — blue outline, height 48px, px-24px, rounded-lg.
    - On click: per-line item buttons appear: `[Accept]` `[Reject]` `[Negotiate]`
    - Accept: locks line, green checkmark, row grays out
    - Reject: strikethrough + reason dropdown (Too expensive / Not needed / Found alternative / Other)
    - Negotiate: inline price edit for that line (amber highlight)
    - Summary bar updates live: "8 accepted, 2 rejected, 4 pending"
    - `[Submit Partial Response]` available when all lines have a decision
  - "Decline" — red outline, height 48px, px-24px, rounded-lg.
    - On click: confirmation modal: "Decline this quote?" + optional reason dropdown (React Aria `Select`, options: "Price too high", "Found alternative", "Project cancelled", "Other") + optional notes TextArea. "Cancel" + "Decline" (red). On confirm: status → "Declined". Card updates.

**Quote version history (if negotiation happened):**
- Below the current quote content. Heading: "Quote History".
- Collapsible sections per version: "Version 1 (Original) — Mar 28", "Version 2 (Your Counter) — Mar 29", "Version 3 (Revised) — Mar 30".
- Each shows the diff: changed prices highlighted (old price in strikethrough + new price). Items added/removed marked.

**Order tracking view (after acceptance — status "Order Confirmed" and beyond):**
- Same URL, content updates based on status.
- Order reference replaces quote reference: "ORD-2026-00015" Geist Mono.
- 5-stage progress bar: "Confirmed" → "Being Prepared" → "Out for Delivery" → "Delivered" → "Invoice Generated". Same visual as timeline but horizontal, prominent.
- Current stage details:
  - "Being Prepared": "Your order is being fulfilled by our suppliers. Expected dispatch: {date}." Lucide `Package` animation.
  - "Out for Delivery": GPS map (MapLibre GL, wrapped in ClientOnly). Shows driver location as blue dot + route line. ETA: Geist Mono 16px. "Driver: {name}" with call/WhatsApp buttons. Map height: 300px, rounded-xl, border 1px.
  - "Delivered": Proof of delivery: photo thumbnail (click to expand), signature image, delivery timestamp in Geist Mono. "View Full Delivery Report" link.
  - "Invoice Generated": link to invoice in Documents window. "View Invoice" button.
- Payment instructions (shown when order confirmed): bank details card — `var(--color-surface)` bg, rounded-xl, p-20px. Bank name, account number (Geist Mono, copyable — click to copy with Lucide `Copy` 14px), IBAN, SWIFT, reference to include. "Copy All" button (outline, 32px). WhatsApp message: "These details were also sent to your WhatsApp."

**Loading state:** Quote header skeleton + 4 line-item skeletons + total skeleton.

**Error state:** "Failed to load quote details" + Retry.

**Mobile:** Line items table becomes card layout (one card per line item with stacked label:value pairs). Action buttons become fixed bottom bar full width. Map fills full width. Counter-offer in full-screen sub-view.

**RTL/Arabic:** Table columns maintain logical order. Currency in Arabic format. Timeline flows right-to-left. All labels, status text, payment terms translated.

**Version comparison (when multiple versions exist):**
- "Compare versions" button appears next to the version history heading (Lucide `GitCompare` 16px + "Compare" text, outline style, 32px height). Visible only when 2+ versions exist.
- On click: opens Elevated glass modal (max-width 960px, max-height 80vh, centered).
- Layout: two-column comparison. Left column: "Version A" with a dropdown selector (React Aria `Select`, lists all versions). Right column: "Version B" with same dropdown. Defaults: A = previous version, B = current version.
- Diff rendering per line item:
  - Changed cells: amber/yellow background highlight. Shows old value with strikethrough (Geist Mono 400, `var(--color-text-muted)`) + new value (Geist Mono 500, `var(--color-text)`).
  - Added items: entire row with green-tinted background. "NEW" badge (Inter 500 11px, green).
  - Removed items: entire row with red-tinted background, all text strikethrough. "REMOVED" badge (Inter 500 11px, red).
- Summary bar at top of modal: "Total changed from EGP 245,000 to EGP 231,500 (-5.5%)" — Geist Mono for all numbers. Percentage in green if decreased (savings), red if increased.
- Columns compared: Product, Qty, Unit Price, Line Total, Lead Time, Notes.
- Close: Escape or X button. Modal uses `isKeyboardDismissDisabled` (Escape handled by hotkeys).
- Mobile: stacked layout (Version A on top, Version B below) with a "Swipe to compare" gesture hint.

---

### 2.8 Notifications Window

**URL:** `/notifications`
**Accessed from:** Bell icon in portal shell.

**Glass window, smaller:** max-width 480px, max-height 70vh. Positioned near the bell icon (top inline-end area). On mobile: full-screen like other windows.

**Content:**
- Header: "Notifications" + "Mark All Read" link (Inter 500 12px `var(--color-primary)`, visible only when unread exist). Lucide `CheckCheck` 14px.
- Notification list: React Aria `ListBox`. Items sorted newest first.
- Each notification:
  - Height: auto (min 64px). px-16px py-12px. Border-bottom 1px `var(--color-border)`.
  - Unread indicator: 8px blue dot at inline-start. Unread items have `var(--color-surface)` background. Read items have transparent bg.
  - Icon: depends on type. Quote ready: Lucide `FileCheck` (blue). Order update: `Truck` (blue). Delivery: `MapPin` (green). Payment: `CreditCard` (blue). Support: `MessageCircle` (blue). Size: 20px.
  - Title: Inter 500 14px `var(--color-text)`. E.g., "Your quote is ready".
  - Body: Inter 400 13px `var(--color-text-muted)`. E.g., "Quote QR-2026-00042 is ready for review. 5 items, total EGP 245,000."
  - Time: Geist Mono 11px `var(--color-text-subtle)`. Relative: "2 min ago", "1 hour ago", "Yesterday at 14:32". Absolute after 7 days.
  - On click: marks as read + navigates to relevant content (opens the Orders window at the right detail view, etc.). Notifications window closes.
  - Hover: `var(--color-surface)` bg.
- "Load more" button at bottom (if > 20 notifications): "Show older" Inter 400 12px `var(--color-primary)`. Loads next 20.

**Real-time:** New notifications appear at top with spring animation (slide down). Bell badge count updates via Supabase Realtime subscription on `notifications` table filtered by user.

**Empty state:** Lucide `BellOff` 32px muted. "No notifications" Inter 500 16px. "You're all caught up!" Inter 400 14px muted.

---

### 2.9 Documents, Support, Settings (Customer View)

**These are accessible from the profile popover menu. Each opens as a glass window.**

#### 2.9a Documents Window

**URL:** `/documents`

**Content:**
- Tab bar: "Invoices", "Delivery Notes", "Quotes (PDF)", "Certificates", "All".
- Table layout (React Aria `Table` via @hyperquote/tables):
  - Columns: "Document" (icon + name), "Type" (badge), "Related Order" (link, Geist Mono), "Date" (Geist Mono), "Amount" (Geist Mono, if applicable), "Actions" (download + view).
  - Sortable columns (click header to sort). Default: newest first.
  - Filter by date range (DatePicker pair) and search (TextField).
- Each row:
  - Document name: Inter 400 14px. E.g., "Invoice INV-2026-00089".
  - Type badge: semantic status. Invoice: blue. Delivery Note: green. Quote PDF: muted.
  - "View" button (Lucide `Eye` 16px, outline, 32px) — opens PDF in-browser viewer (elevated modal, full-width).
  - "Download" button (Lucide `Download` 16px, outline, 32px) — triggers R2 presigned URL download.
- Pagination: 20 per page. Same pagination pattern as website market.

**Empty state:** "No documents yet." + "Your invoices and delivery notes will appear here after your first order."

#### 2.9b Support Window

**URL:** `/support`

**Content:**
- Two sections:
  - Active tickets (if any): card list with ticket number (Geist Mono), subject, status badge, last updated date.
  - New ticket: "Contact Support" card with 3 options:
    - WhatsApp (primary): green button, links to `wa.me` with pre-filled message including user name and company.
    - In-app chat: opens chat interface within the window. Messages go to customer support team. Real-time via Supabase Realtime.
    - Submit ticket: form — Subject (Select: "Order Issue", "Delivery Problem", "Invoice Question", "Damaged Goods", "Account Help", "Other"), Description (TextArea, required, min 20 chars), Related Order (ComboBox, optional, lists recent orders), Attachments (file upload, max 5 files). "Submit Ticket" button (blue, 44px). Confirmation: reference number shown.
- Ticket detail view: click ticket card → sub-view with conversation thread. Each message: sender (customer or support), timestamp (Geist Mono), message text. Reply input at bottom.

#### 2.9c Settings Window

**URL:** `/settings`

**Sections (vertical menu inline-start, content inline-end):**

**Profile:**
- Company name: editable TextField.
- Contact name: editable TextField.
- Phone number: displayed (read-only, change requires support). Geist Mono.
- Email: editable TextField (if Stage 2 complete). Otherwise: "Add your email for invoices and updates" prompt with TextField + "Save" button.
- Trade license: upload area (if Stage 2 not complete). Status: "Not uploaded", "Under Review", "Verified" (with badge). File preview (thumbnail).
- Profile photo: 64px circle with "Change" overlay on hover. Upload accepts JPG/PNG, max 2MB. Crop interface (elevated modal).

**Addresses:**
- Saved delivery addresses list. Each: card with address text, "Edit" link, "Delete" link, "Set as Default" radio.
- "Add New Address" button at bottom. Form: same as Material List Builder Step 2 address form.
- Delete confirmation: elevated modal.

**Projects:**
- List of projects. Each: name, number of orders, date created.
- "Create Project" button. Inline form: name (required) + description (optional).
- Edit / archive project.

**Team (Multi-User Accounts):**
- List of team members. Each: name, email, role badge (buyer/approver/site manager), status (active/invited).
- "Invite Team Member" button:
  - Form: Email (required), Role (Select: "Buyer" — can browse and create quote requests, "Approver" — can accept quotes and confirm orders, "Site Manager" — can view orders and track deliveries, read-only).
  - "Send Invite" button (blue). Sends email invitation.
- Remove member: confirmation modal. Only account owner can remove.
- Role change: dropdown on member card. Takes effect immediately.

**Notifications:**
- Per-channel toggles (React Aria `Switch`): WhatsApp (on/off), Email (on/off), Push (on/off), SMS (on/off).
- Per-event toggles: "Quote ready", "Order status change", "Delivery update", "Invoice generated", "Payment confirmation", "Support response".
- "Quiet hours" — from/to time pickers. Notifications queued during quiet hours, delivered after.

**Language & Appearance:**
- Language: React Aria `RadioGroup`. "العربية (Arabic)" / "English". Changes immediately.
- Theme: React Aria `RadioGroup`. "Light" / "Dark" / "System". Changes immediately.
- Number format: "Arabic-Indic (١٢٣)" / "Western (123)". Only shown when Arabic is selected.
- Date format: "Gregorian" / "Hijri" option.

**Security:**
- Active sessions: list with device name, last active (Geist Mono), location. "Sign out" per session. "Sign out all other sessions" button.
- MFA: optional. "Enable two-factor authentication" toggle. Setup flow: QR code for TOTP app.

**"Save Changes" behavior:** Changes save immediately on blur/change for toggles and selects. Text fields show a "Save" button that appears when content changes. Unsaved changes warning if navigating away (React Router `beforeLoad` prompt).

**Mobile:** Settings sections as full-screen list. Tap section → pushes full-screen sub-view. Back gesture returns to list.

---

### 2.10 Supplier View — Overview

**When user toggles to Supplier mode (2.2), the canvas updates:**

**Greeting:** Same time-aware greeting.

**AI Chat:** Same centered position. Context switches to supplier-relevant prompts:
- Placeholder rotates: "How can I help with your supplier account?" → "Try: Update my cement prices" → "Try: Show me my pending POs".

**Navigation buttons change to:**
- "Stock & Pricing" (Lucide `Package` 24px) — opens Stock Management window (2.11).
- "Purchase Orders" (Lucide `ClipboardList` 24px) — opens PO Inbox window (2.12). Badge shows count of pending POs.
- "Analytics" (Lucide `BarChart3` 24px) — opens Analytics window (2.14).

**Additional menu items in profile popover:**
- "Invoice Submission" (Lucide `Receipt`).
- "Catalog Upload" (Lucide `FileUp`).
- "Quality Requirements" (Lucide `ShieldCheck`).
- Standard items remain: Settings, Documents, Support, Sign Out.

**Keyboard shortcuts (supplier mode):**
- `S` — Stock & Pricing window.
- `P` — Purchase Orders window.
- `A` — Analytics window.

---

### 2.11 Stock & Pricing Window (Supplier View)

**URL:** `/supplier/stock`
**Glass window.**

**Window header:**
- Title: "Stock & Pricing".
- Right: "Upload Catalog" button (blue outline, 36px, Lucide `FileUp` 16px) + "Bulk Update" button (blue outline, 36px, Lucide `Table` 16px).

**Tab bar:** "My Products", "Price Updates", "Upload History".

**My Products tab:**
- Table (React Aria Table via @hyperquote/tables):
  - Columns: "Product" (name bilingual), "SKU" (Geist Mono), "Current Price" (Geist Mono, editable), "Stock Qty" (Geist Mono, editable), "Last Updated" (Geist Mono, relative time), "Status" (badge: "Active" green, "Low Stock" yellow, "Out of Stock" red, "Suppressed" gray), "Actions".
  - Sortable columns. Default sort: "Last Updated" descending.
  - Search field in toolbar: filters table.
  - Editable cells: clicking on "Current Price" or "Stock Qty" makes the cell an inline NumberField (Geist Mono). On blur or Enter: saves immediately via PATCH server function. Brief success indicator: cell background flashes `var(--color-success-bg)` for 500ms. On error: cell reverts, error toast.
  - Freshness color coding on "Last Updated": < 24h green, 1-3 days yellow, > 3 days red.
  - Actions column: "Edit" (Lucide `Pencil` 16px) opens full product edit drawer. "Deactivate" (Lucide `EyeOff` 16px) toggles product visibility.
- Pagination: 50 per page.

**Product edit drawer (slides in from inline-end, 480px width, elevated glass):**
- Product name (read-only — name changes require HyperQuote review).
- Price: NumberField, required. Currency prefix/suffix per locale.
- Minimum Order Quantity: NumberField.
- Stock quantity: NumberField.
- Lead time (if made-to-order): NumberField + "days" label.
- Region pricing: if multiple regions, a table of region → price.
- Notes: TextArea.
- "Save" button (blue, 44px, full width). "Cancel" closes drawer.

**Price Updates tab:**
- History of all price changes. Table: Product, Old Price (Geist Mono, strikethrough), New Price (Geist Mono), Changed By, Date (Geist Mono), Status (badge: "Applied", "Pending Review", "Rejected").
- Filter by date range.
- For "Pending Review" items: note explaining why review is needed ("New supplier — first 3 months require price review").

**Upload History tab:**
- List of catalog uploads. Each: filename, date (Geist Mono), items parsed count (Geist Mono), status (badge: "Processing", "Completed", "Failed", "Review Required").
- Click to see details: side-by-side view of original document + extracted data.

**"Upload Catalog" flow (triggered from header button):**
1. Upload modal (elevated glass): Drag-and-drop zone. Accepts PDF, Excel, CSV. Max 50MB.
2. Processing state: animated progress. "AI is parsing your catalog..."
3. Review screen: two-column layout. Left: original document viewer (PDF rendered inline or Excel table). Right: extracted data table with confidence scores per field.
   - High confidence (> 90%): green checkmark. Auto-approved.
   - Medium (70-90%): yellow flag. Supplier should verify.
   - Low (< 70%): red flag. Requires manual input.
   - Each extracted row: editable fields. Supplier corrects any errors.
4. "Submit for Review" button (blue, 48px). Items go to HyperQuote procurement team for final approval (new suppliers/categories). Trusted suppliers: auto-approved items go live immediately.
5. Toast: "Catalog submitted. {N} items auto-approved, {M} items pending review."

**"Bulk Update" flow:**
1. "Download current prices as CSV" link — generates CSV of all supplier's products with current prices + quantities.
2. Upload modified CSV with new prices/quantities.
3. Preview screen: diff view. Changed values highlighted (old → new, red → green). Unchanged rows grayed out.
4. "Apply Changes" button. Confirmation: "Update {N} prices and {M} stock quantities?" On confirm: batch update.

**Empty state:** "You haven't added any products yet." + "Upload Catalog" button (blue, 44px) + "Or add products manually" link that opens product edit drawer with empty fields.

**Loading state:** Table skeleton — 8 rows with shimmer.

**Mobile:** Table becomes card list. Editable fields: tap to edit (opens inline). Edit drawer becomes full-screen. Upload flow same.

**RTL/Arabic:** Table reads naturally. Prices use Arabic format. All labels translated.

---

### 2.12 Purchase Orders Inbox (Supplier View)

**URL:** `/supplier/orders`
**Glass window.**

**Window header:**
- Title: "Purchase Orders".
- Badge count of "Pending" POs.

**Tab bar:** "Pending Action", "Confirmed", "History".

**Pending Action tab:**
- Cards sorted by urgency (oldest first). Each PO card:
  - PO reference: Geist Mono 16px `var(--color-primary)`. "PO-2026-00123".
  - Status badge: "Awaiting Confirmation" (yellow), "Partially Confirmed" (blue).
  - Date received: Geist Mono 12px muted. "Received: Mar 28, 14:32".
  - Response deadline: Geist Mono 12px. If < 4h remaining: `var(--color-warning)`. If overdue: `var(--color-error)`.
  - Items summary: "{N} items · Total: EGP {amount}" — amounts in Geist Mono.
  - On click: opens PO detail view.

**PO detail view (sub-view within window):**
- Back button.
- PO header: reference, date, status, from "HyperQuote".
- Line items table: "#", "Product", "Qty Requested" (Geist Mono), "Unit Price" (Geist Mono), "Line Total" (Geist Mono), "Confirm" (per-line toggle).
  - Each line has: confirm checkbox (React Aria `Checkbox`). If supplier cannot fulfill: uncheck + "Reason" dropdown appears (Select: "Out of Stock", "Partial Only", "Price Changed", "Lead Time Needed").
  - If "Partial Only": quantity field appears (NumberField, max = requested qty).
  - If "Price Changed": new price field appears (NumberField). Requires HyperQuote review.
- Delivery scheduling section:
  - Estimated ship date: React Aria `DatePicker`. Required.
  - Delivery method: Select — "Supplier Delivers" or "HyperQuote Pickup".
  - Tracking number: TextField (optional, can add later).
  - Notes: TextArea.
- Action buttons (sticky bottom):
  - "Confirm PO" (green, 48px, flex-1): submits confirmation for all checked lines.
    - Confirmation modal: "Confirm {N} of {M} items? {partial details if applicable}." + "Cancel" / "Confirm" (green).
    - On success: status → "Confirmed". Toast: "PO confirmed. Delivery expected by {date}."
  - "Reject PO" (red outline, 48px, px-24px):
    - Requires reason: TextArea in confirmation modal. "Why are you rejecting this PO? This will be reviewed by HyperQuote."
    - On submit: status → "Rejected". Toast: "PO rejected. HyperQuote has been notified."

**Confirmed tab:**
- PO cards with status "Confirmed" or "In Production" or "Shipped".
- Each shows: ship date, tracking number (if added), delivery progress.
- "Update Status" button on each: dropdown to advance status ("Shipped" → enter tracking number, "Delivered" → add delivery note).
- "Submit Invoice" button: opens Invoice Submission flow (2.13).

**History tab:**
- All POs regardless of status. Date range filter. Search by PO number.

**Loading / Empty / Error:** Same patterns as Orders window.

**Mobile:** Cards full width. PO detail full-screen. Line items as stacked cards.

---

### 2.13 Invoice Submission (Supplier View)

**URL:** `/supplier/invoices`
**Accessed from:** Profile menu "Invoice Submission" or from a confirmed PO's "Submit Invoice" button.

**Glass window.**

**Content:**
- Tab bar: "Submit New", "Submitted Invoices".

**Submit New tab:**
- Form (React Hook Form + Zod):
  - Related PO: React Aria `ComboBox`. Lists confirmed/shipped POs without invoices. Required.
  - Invoice number: TextField. Required. Supplier's own invoice number. Geist Mono.
  - Invoice date: DatePicker. Default: today. Required.
  - Line items: auto-populated from PO. Each line: product name, quantity, unit price (editable — must match PO price or explain variance), line total (calculated).
  - Subtotal: calculated, Geist Mono.
  - VAT (14%): calculated, Geist Mono.
  - Total: calculated, Geist Mono 18px bold.
  - Invoice PDF: required file upload. "Upload your invoice (PDF)" drag-and-drop. Max 10MB.
  - Notes: TextArea, optional.
- "Submit Invoice" button (blue, 48px).
  - Validation: all required fields filled, at least one line item, PDF uploaded, total matches calculated total (within 1% tolerance — if mismatch: warning "Your total doesn't match the calculated total. Please verify.").
  - Confirmation modal: "Submit invoice {number} for EGP {total}?" + "Cancel" / "Submit".
  - On success: toast "Invoice submitted. HyperQuote will process payment per agreed terms."

**Submitted Invoices tab:**
- Table: Invoice # (Geist Mono), PO # (Geist Mono), Amount (Geist Mono), Date (Geist Mono), Status (badge: "Submitted", "Under Review", "Approved", "Paid", "Disputed"), Payment Date (Geist Mono, if paid).
- Click row: opens detail with all invoice info + status timeline.

**Mobile:** Form fields full width. Upload area larger.

---

### 2.14 Analytics Window (Supplier View)

**URL:** `/supplier/analytics`
**Glass window.**

**Window header:** "Analytics" + date range picker (React Aria `DateRangePicker`, default: last 30 days).

**KPI cards (top row, 4 cards across, 2x2 on mobile):**
- Each card: bg `var(--color-surface)`, rounded-xl, p-20px. Min-width 200px.
  - KPI label: Inter 500 12px `var(--color-text-muted)`, uppercase, letter-spacing 0.05em.
  - KPI value: Geist Mono 600, 28px, `var(--color-text)`.
  - Trend indicator: small arrow (Lucide `TrendingUp` or `TrendingDown` 14px) + percentage (Geist Mono 12px). Green for positive, red for negative.
  - Cards: "Revenue" (total PO value), "Fill Rate" (% of PO lines confirmed), "On-Time Rate" (% delivered by promised date), "Quote Inclusion" (% of customer quotes that include supplier's products).

**Product performance table (below KPIs):**
- Columns: "Product", "Views" (Geist Mono — how many times viewed on marketplace), "Quote Inclusions" (Geist Mono), "POs" (Geist Mono), "Revenue" (Geist Mono), "Win Rate" (Geist Mono, percentage).
- Sortable. Top 20 products. "View All" expands.

**Monthly revenue chart placeholder:**
- Area for a chart component (to be implemented with a charting library — specification only: bar chart, monthly totals, Geist Mono axis labels, blue bars, hover tooltip with exact values).
- Dimensions: full width, 300px height, rounded-xl border.

**Empty state (new supplier, no data):**
- "No analytics data yet." + "Analytics will appear after your first confirmed purchase order." + icon Lucide `BarChart3` 48px muted.

**Loading:** KPI cards: 4 skeleton cards (value + label placeholders). Table: 6 row skeletons.

**Mobile:** KPI cards: 2x2 grid. Table: card list per product. Chart: full width, swipeable if needed.

---

### 2.15 Repeat Purchase Features (Customer View)

**These features are integrated across the portal, not a separate window.**

**Saved Lists (within Settings > Projects or via AI chat):**
- Each project can have saved material lists. Displayed in Orders window under "Drafts" tab with a "Saved Lists" sub-section.
- Each saved list card: list name, item count (Geist Mono), last used date (Geist Mono). "Reorder" button (blue outline, 36px) — opens Material List Builder pre-filled with list items. "Edit" link.

**One-tap Reorder (on order history cards):**
- Every completed order in "History" tab has a "Reorder" button (Lucide `RefreshCw` 16px + "Reorder", blue outline, 36px).
- On click: pre-fills Material List Builder (Step 1) with all items from that order. Quantities match original. User can edit before submitting.
- Confirmation: "Reorder {N} items from order ORD-2026-00015?" with "Edit First" (outline) and "Quick Submit" (blue) options. "Quick Submit" skips to Step 2 (delivery details) with last-used address pre-selected.

**Favorites:**
- Heart icon (Lucide `Heart` 16px, outline by default) on product cards in Market window and product detail. On click: toggles favorite (fills with `var(--color-error)` — exception to three-color rule, this is a data state). Saved in user profile.
- "Favorites" filter chip in Market window toolbar. When active: shows only favorited products.

**AI reorder suggestions (in AI chat):**
- AI proactively suggests reorders based on purchase history. Appears as a subtle suggestion card above the chat input (not a chat message — a contextual hint).
- Card: `var(--color-info-bg)` bg, rounded-xl, p-12px. "You ordered cement 30 days ago. Time to reorder?" + "Reorder" button (blue, 32px) + dismiss "X".
- Shown only once per suggestion. Dismissed suggestions don't reappear for 7 days.
- Maximum 1 suggestion visible at a time.

---

### 2.16 Guest Order Claiming (Customer View)

**Scenario:** A customer was added by a sales rep via "Add Customer" in the internal app (phone order). They later visit the portal and sign up.

**Flow (detailed in Login Modal section 1.9 — "Account claiming"):**
1. Customer visits `portal.hyperquote.net`. Redirected to website login.
2. Enters phone number → receives OTP → verifies.
3. System detects unclaimed `customers` record matching this phone.
4. Shows masked hint: "A**** C****" — "Is this your company?"
5. "Yes, that's me" → account linked. Portal shows ALL previous order history immediately.
6. "No, create a new account" → new customer record created.

**Post-claiming portal experience:**
- Orders window shows all orders (phone orders + portal orders).
- Phone orders may have minimal details (no delivery address entered by customer, just what the sales rep captured). Card shows: "Phone Order · Created by HyperQuote team" label.
- Documents from phone orders are available.
- Customer can now place orders themselves via the portal.

---

### 2.17 Multi-User Account (Customer View)

**Roles defined in Settings > Team (section 2.9c).**

**Role permissions:**

| Feature | Buyer | Approver | Site Manager |
|---------|-------|----------|-------------|
| Browse market | Yes | Yes | Yes |
| Create quote requests | Yes | Yes | No |
| Accept/decline quotes | No | Yes | No |
| View orders | Yes | Yes | Yes (own projects only) |
| Track deliveries | Yes | Yes | Yes |
| View invoices | No | Yes | No |
| View documents | Own only | All | Project only |
| Manage team | No | Account owner only | No |
| AI chat | Full (within role) | Full | Read-only + status queries |

**Unauthorized elements are HIDDEN, not disabled (per UI-VISION.md).** If a Buyer cannot accept quotes, they don't see the "Accept" button. If a Site Manager can't view invoices, the "Invoices" tab in Documents is hidden.

**Account owner:** The first user (who created the account) is the owner. Owner has all Approver permissions + can manage team + can transfer ownership (in Settings > Team > "Transfer Ownership" link, requires confirmation with OTP).

**Invitation flow:**
1. Owner enters email + role in Settings > Team.
2. Email sent with magic link to `portal.hyperquote.net/join?token={uuid}`.
3. Invitee clicks link → if no HyperQuote account: goes through signup (phone OTP + name only, company auto-assigned). If has account: confirms joining the organization.
4. New team member appears in the team list with their role.

---

### 2.18 PWA Behavior

**Service Worker:** Manual Workbox configuration (vite-plugin-pwa incompatible with TanStack Start).
- Precache: app shell, critical CSS, fonts, icons.
- Runtime cache: API responses (stale-while-revalidate, 5min max-age), product images (cache-first, 7-day max-age).
- Offline fallback: cached pages served. Mutations disabled.

**Install prompt:**
- Trigger: after 3rd visit (localStorage counter).
- Banner: subtle, bottom of viewport (described in 2.2).
- After install: app opens in standalone mode. No browser chrome. Status bar color matches theme.

**Push notifications:**
- Service Worker registration on first login.
- Permission request: NOT immediately. Requested when user takes a notification-worthy action (e.g., submits first quote request). Prompt: "Get notified when your quote is ready?" + "Enable" / "Not now".
- Push payload: title, body, icon (HyperQuote logo), click_action (deep link to relevant content).

---


> **Implementation:** TanStack Start SPA | Deploy: Cloudflare Workers | Auth: Supabase SSR (internal auth pool, SSO with CEO app)
> **Key packages:** react-aria-components, motion, zustand, @tanstack/ai-react, react-hook-form, zod, fuse.js, react-map-gl, maplibre-gl
> **Shared packages:** @hyperquote/ui, @hyperquote/auth, @hyperquote/i18n, @hyperquote/forms, @hyperquote/tables

## APP 3: INTERNAL PLATFORM (app.hyperquote.net)

**Type:** TanStack Start SPA. Single unified application with 11 role-based modules.
**Stack:** TanStack Start + React Aria Components + Motion v12 + Tailwind CSS v4 + Zustand + react-i18next (see `essential/brand/STACK-DECISION.md`)
**Deploy:** Cloudflare Worker at `app.hyperquote.net`
**Auth:** Supabase Auth via `@supabase/ssr`, internal auth pool cookie on `.hyperquote.net`. SSO with CEO app (same pool).
**Offline:** IndexedDB for structured data, Service Worker for app shell. Cached data shown with "Last synced" timestamp. Mutations disabled when offline.

---

## SHELL: Layout, Navigation, and Canvas

### Post-Login Layout

Wide open space. Pure white (light mode) or pure black (dark mode). No decoration.

**Left edge:** Soft vertical strip of minimal icons, one per module. Always visible, never hidden behind hover. Icons are permission-filtered -- if the employee lacks access to a module, the icon does not render and the hotkey does not register.

**Canvas (home state):**
- Clean greeting in the center area: "Good morning, Ahmed" (time-aware: morning/afternoon/evening, localized)
- If urgent items exist: "Good morning, Ahmed -- 3 items need attention" with subtle emphasis on the count
- 1-2 contextual quick-action buttons based on role (e.g., sales sees "Open RFQ Inbox", dispatcher sees "View Today's Routes")
- NO KPI cards, NO metrics, NO charts on the canvas. Data lives inside module windows.
- Lion watermark at barely-perceptible opacity in the background (light mode: LyonBlack.svg, dark mode: LyonWhite.svg)

**Urgent item sources (aggregated for the count):**
- RFQs unassigned > 30 minutes
- Quotes expiring within 24 hours
- Approvals pending for this user
- Deliveries with problems (red status)
- Invoices overdue > 60 days (finance only)
- SLA breaches in progress

### Navigation Model

**Icon strip (vertical, left side in LTR, right side in RTL):**

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
- Click icon or press hotkey: glass window opens with spring animation, canvas recedes gently
- Press different hotkey while window open: crossfade swap to new module
- Press `Escape`: close current window, return to canvas
- Press same hotkey: close current window (toggle behavior)
- Hotkeys fire only when no text input is focused (keyboard scope via XState store: Canvas -> Panel -> Input states)

**Ctrl+K: Command Palette**
- Elevated glass window (stronger frosted effect, floats above everything)
- Built from React Aria `Autocomplete` + `Dialog` + `Menu`
- Fuzzy search via fuse.js across: entities (orders, quotes, customers, suppliers, products), actions ("Create Quote", "Assign Driver"), module navigation, recent items
- Results grouped by category with keyboard navigation (arrow keys, Enter to select)
- Permission-filtered: user only sees entities and actions they can access

**Notifications:**
- Badge/dot indicator on a bell icon in the top-right area of the canvas
- No glow, no pulse, no animation on the badge itself
- Click opens a notifications glass window (same pattern as modules)
- Notifications grouped by time (Today, Yesterday, Older)
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
- **Window header:** Every glass window has a 56px header bar at the top. Left side (inline-start): module icon (Lucide, 20px, `var(--color-text-muted)`) + module name (Inter 600 16px, `var(--color-text)`), gap 8px. Right side (inline-end): close button (Lucide `X` 20px, 44px touch target, `var(--color-text-muted)`, hover `var(--color-text)`). Subtle bottom border (1px `var(--color-border)` at 50% opacity). px-24px. The header identifies which module is active at all times — critical when switching between modules via hotkeys.
- Windows take up ~90% of viewport width and height on desktop, 100% on mobile
- Scrollable content within the window
- **Window state preservation:** When a user presses a different hotkey to swap modules, the current window's state is preserved in Zustand store (keyed by module name). Preserved state includes: scroll position, active tab/sub-view, form input values, step progress in multi-step flows, selected filters, and expanded/collapsed sections. On return (pressing the same hotkey again), the window restores to the exact previous state with no loading delay (data from TanStack Query cache). State is session-scoped — cleared on logout or browser close. Auto-saved form drafts (persisted to server via `saveDraft()` server function) are separate from window state — drafts survive across sessions, window state does not.

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

### Typography & Color Rules

See **Shared Design System** sections DS.2 (Typography) and DS.1 (Color System) for the full specification. Internal Platform follows all shared rules with no overrides.

---

## MODULE 1: SALES

**Primary users:** Account Managers, Inside Sales Reps, Quoting Specialists, Sales Manager
**Hotkey:** `S`
**Role visibility:** All sales-role employees see this module. Sales Manager sees additional team view and approval queue.

### 1.1 Sales Home View (inside the glass window)

Not a traditional dashboard. A prioritized feed that answers: "What do I need to do right now?"

**Layout:**

Top strip: tabs/segments for switching sub-views: `[Home] [RFQ Inbox] [Quote Builder] [Pipeline] [Customer 360] [Contacts] [Calendar] [Reports]`

**Home content:**

**Urgent Section (top):**
- Cards for: RFQs awaiting response (count + oldest age), Quotes expiring this week (count + total value at risk), Overdue follow-ups (count)
- Each card is clickable -- navigates to filtered view
- Color: red border if any item is critical (>4h for Tier A, >8h for Tier B)

**Pipeline Snapshot (middle):**
- Single horizontal bar: pipeline value (unweighted), weighted forecast, monthly target with progress indicator
- Mini funnel: deal count per stage (RFQ Received -> Quoting -> Sent -> Negotiating -> Won/Lost)
- All numbers in Geist Mono

**Activity Feed (bottom):**
- Chronological stream: new RFQs, quote views by customer, payment received, delivery confirmed, quote won/lost
- Each item: icon + description + timestamp + action button (e.g., "Open Quote", "Call Customer")
- Filter by type: `[All] [RFQs] [Quotes] [Orders] [Payments] [Comms]`
- Real-time updates via Supabase Realtime

### 1.2 RFQ Inbox

**Layout:** Email-inbox style. Left: list of RFQs. Right: preview pane (desktop). Mobile: list only, tap to open detail.

**Toolbar:**
- Tab filters: `[All] [My RFQs] [Unassigned] [Needs Clarification] [Urgent]`
- Sort: `[Newest] [Oldest] [Highest Value] [Customer Tier]`
- Filter dropdowns: Date Range, Customer, Material Category, Status
- Keyboard: `J`/`K` to move up/down in list (when panel focused, not input)

**Each RFQ row:**
- Priority indicator (auto-calculated): `!!!` (critical, score >75), `!!` (high, 50-75), `!` (medium, 25-50), blank (normal)
- Age timer in Geist Mono: changes color at 2h (green->yellow), 4h (yellow->orange), 8h (orange->red), 24h (pulsing red)
- Customer company name + tier badge (Gold=A, Silver=B, Bronze=C)
- Estimated quote value (AI-estimated from quantities + recent pricing, Geist Mono)
- Line item count
- Status pill: New, Assigned, In Progress, Needs Clarification, Quoted, Expired
- Assigned rep avatar/initials

**Priority Score Formula:**
```
Score = (Tier Weight x 40%) + (Value Weight x 30%) + (Age Weight x 20%) + (Delivery Urgency x 10%)
Tier: A=100, B=60, C=30, New=20
Value: >EGP 5M=100, 1-5M=80, 500K-1M=50, <500K=20
Age: <1h=20, 1-4h=40, 4-8h=60, 8-24h=80, >24h=100
Delivery: <7d=100, 7-14d=70, 14-30d=40, >30d=20
```

**Preview pane data:**
- Customer name, tier, contact name and role
- Project name
- Requested delivery date
- Material breakdown (categories with percentages)
- Customer notes/special instructions
- Customer history sidebar: total orders, lifetime value, average margin, AR status, last order date
- Similar past quotes (AI-matched)
- AI insight: "MetroBuild typically counters 8-12% below first quote. Recommend starting at 20% margin."

**Actions on preview:**
- `[Open Full Detail]` `[Assign to Me]` `[Assign to...]` `[Request Clarification]` `[Start Quote]`

**Auto-assignment rules (system, not UI):**
1. Account owner first
2. Territory fallback if owner unavailable
3. Round-robin for unassigned (weighted by workload)
4. Specialization override for specialty materials
5. Value-based escalation: >EGP 25M routes to senior sales + primary rep
6. Capacity throttle: if rep has >X active quotes, next available rep gets assignment

Assignment happens within 30 seconds. Push notification to assigned rep.

**SLA timers:**
- Tier A: 2h response, escalation at 4h
- Tier B: 4h response, escalation at 8h
- Tier C: 8h response, escalation at 24h
- New Customer: 4h response, escalation at 8h

### 1.3 RFQ Detail View

Full-screen view of a single RFQ.

**Left column (60%):** Material Request
- Table: row number, material name, specification, quantity (Geist Mono), unit, customer notes
- Delivery requirements: location (address on map pin), requested date, delivery type (jobsite/pickup), special instructions
- Attached files: drawings, specs, photos (thumbnail grid, click to preview)

**Right column (40%):** Customer Context
- Customer Snapshot card: company name, tier, contact name + phone + email
- History: order count, lifetime value (Geist Mono), average order size, average margin, last order date, payment history rating
- Credit: limit, current balance, available (Geist Mono), overdue amount
- Similar Past Quotes: AI surfaces 2-3 similar quotes with win/loss and margin
- AI Insights: behavioral prediction, recommended starting margin, win probability, suggested response timeline

**Actions bar (bottom):**
- `[Start Quote]` (primary, blue) -- converts RFQ to draft quote
- `[Request Clarification]` -- opens structured form with common questions (material spec ambiguous, quantity unclear, delivery access, no date, mixed units, missing attachment) + free text. Sends via portal notification + email + WhatsApp. RFQ moves to "Awaiting Clarification" status. Auto-follow-up at 48h. Archive at 7d with "No Response."
- `[Decline RFQ]` -- requires reason selection (outside service area, cannot source, customer blacklisted) + optional note
- `[Assign to...]` -- reassign to another rep
- `[Add Note]` -- internal note (not visible to customer)
- `[Call Customer]` -- opens phone dialer / logs call activity
- `[View Full Customer Profile]` -- opens Customer 360

### 1.4 Quote Builder (10-Step Workflow)

The most complex screen. Single-page editing surface -- all line items, pricing, terms, and margins visible simultaneously. No multi-step wizard.

**Auto-save:** Every 30 seconds. Draft never lost. "Auto-saved Xs ago" indicator in header.

**Header:**
- Quote number (auto-generated), version badge (v1, v2...), status pill (Draft/Pending Approval/Sent/Negotiating)
- Customer name + tier badge
- Linked RFQ reference
- `[Save Draft]` `[Preview PDF]` `[Request Approval]` `[Send to Customer]`

#### Step 1: Initialize Quote
- Rep clicks "Start Quote" from RFQ detail
- System auto-populates: customer info, delivery address, material list from RFQ
- Version set to v1, auto-save begins
- Credit status check runs in background -- yellow banner if near/over limit: "Customer credit: EGP 1.4M available of EGP 2M limit"

#### Step 2: Review and Refine Line Items
- Editable table with columns: #, Material, Specification, Quantity, Unit, Supplier Cost, Margin %, Sell Price, Line Total
- Rep can: edit quantities, add/remove items, split lines (source from two suppliers), substitute materials, import from catalog search, copy from past quote
- Keyboard: Tab between cells, Enter to confirm and move to next row
- Inline editing: click any cell to edit. No modals for simple changes.

#### Step 3: Procurement Cost Lookup (Per Line Item)
- For each line item, system fetches latest supplier cost data automatically:
  - **Fresh price** (<24h, green dot): shows cost + auto-calculated margin. Rep can quote live on the phone.
  - **Aging price** (1-3 days, yellow dot + "Verify" badge): shows last known price. Rep can use as estimate or request refresh.
  - **Stale/missing price** (>3 days or no data, red dot): "Awaiting Procurement Input" -- rep can send cost request to procurement team. Items marked "Price on Application" in partial quote.
- Cost column shows "Internal Cost" (actual supplier cost + 2-3% procurement buffer). Rep does NOT see actual supplier invoice cost.
- Multiple supplier options: if multiple suppliers can provide an item, system shows cost from each. Recommended supplier highlighted (best combination of cost, lead time, reliability).

**Live Quote Builder layout (what rep sees during a call):**
```
LIVE QUOTE -- QR-2026-00XXX
| Item           | Supplier | Cost      | Margin | Price    | Status |
| Cement 500bag  | Supp A   | EGP 47    | 20%    | 56.40    | Fresh  |
| Rebar 200bndl  | Supp A   | EGP 3,250 | 15%    | 3,738    | Fresh  |
| Plywood 100    | Supp D   | --        | --     | --       | Awaiting|
| PVC 50 pcs     | Supp A   | EGP 82    | 18%    | 96.76    | Fresh  |
| Subtotal (3/4): EGP 780,380                                        |
| [Send Partial Quote] [Wait for All Items]                           |
```

#### Step 4: Set Pricing Per Line Item

**Four methods:**
1. **Set margin %**: Rep types desired margin, system calculates sell price
2. **Set price directly**: Rep types unit price, system calculates margin
3. **Blanket margin**: "Set all to 18%" button applies to all rows
4. **Price from history**: "Use price from Quote #XXXX" for same customer/material

**Margin Guardrails (per line item, visual indicators):**

| Margin Level | Visual | Behavior |
|---|---|---|
| At/above target (e.g., 18%+) | Green background on margin cell | Auto-approved, no restrictions |
| Between target and floor (e.g., 12-18%) | Yellow background on margin cell | Warning badge, rep can proceed |
| Below floor (e.g., <12%) | Red background on margin cell, row highlighted | Cannot send without manager approval |
| Below absolute minimum (e.g., <8%) | Red background + "CEO Approval Required" tag | Escalated approval chain |
| Negative margin | Red background + system blocks save | System prevents saving below-cost pricing |

**Margin benchmarks by category (configurable in Admin):**

| Category | Target | Floor | Absolute Min |
|---|---|---|---|
| Cement/Concrete | 18-22% | 14% | 8% |
| Steel/Rebar | 12-18% | 10% | 6% |
| Lumber/Timber | 15-20% | 12% | 8% |
| Roofing | 22-28% | 18% | 12% |
| Specialty/Custom | 30-45% | 25% | 15% |

**Margin Control Panel (right sidebar):**
- Overall blended margin (Geist Mono, large)
- Target margin for this customer tier
- Floor margin
- Whether approval is needed (YES/NO with reason)
- Quick adjust buttons: "Set All to 15%", "Set All to 18%", "Set All to 20%"
- What-if calculator: "If customer counters -5%: new margin X%, revenue impact -EGP Y, needs approval: YES/NO"

#### Step 5: Delivery Terms
- Calendar picker for delivery date
- System cross-references warehouse stock + supplier lead times
- Warning if requested date is infeasible: "Earliest feasible: [date]" with explanation
- Delivery method: `[Jobsite Delivery]` `[Customer Pickup]` `[Third-Party Carrier]`
- Special instructions text area (crane offload, restricted hours, multiple drops)
- Delivery cost: separate line item. Zone-based pricing (Zone 1: 0-25km, Zone 2: 25-50km, Zone 3: 50-100km). Weight surcharges for heavy materials. Equipment surcharges (Moffett, crane, boom) as separate lines.
- Free delivery threshold check: "Order qualifies for free delivery" or "Add EGP X for delivery"

**Cairo Truck Ban enforcement:** If delivery address is in Greater Cairo and order weight >5 tons, system auto-sets delivery window to 12AM-6AM and shows alert: "Heavy materials in Cairo require night delivery (12AM-6AM) per truck ban regulations." Dispatcher cannot override this for heavy vehicles.

#### Step 6: Payment Terms
- Dropdown of customer's approved payment terms (set by finance): Net 30, Net 45, Net 60, Net 90, Progress payments, Letter of Credit
- Credit status displayed alongside: limit, outstanding, available (all Geist Mono)
- If quote value exceeds available credit: yellow warning + "Request Credit Limit Increase" button (sends to finance)
- New customer default: "50% advance + 50% COD by certified bank check" -- system auto-applies, rep can request override via finance approval
- Early payment discount option (e.g., 2/10 Net 30)

#### Step 7: Quote Validity Period
- Default: 14 days (stable items) or 5-7 days (volatile: steel, cement) -- system auto-selects based on material categories present
- Rep can adjust within 5-30 day range
- System warns if validity exceeds 14 days with volatile materials present
- Expiry: quote auto-moves to "Expired" status, customer must request re-quote

#### Step 8: Approval Workflow (if triggered)

**Triggers:**
```
Margin Check:
  >= Target: No approval needed, rep sends immediately
  >= Floor but < Target: Sales Manager approval
  < Floor: VP Sales approval
  < Absolute Minimum: CEO approval (strategic deal)

Value Check:
  < EGP 2.5M: Rep authority
  EGP 2.5M - 10M: Sales Manager
  EGP 10M - 50M: Sales Manager + Director
  > EGP 50M: Sales Manager + Director + CEO
```

- Rep clicks `[Request Approval]`
- Quote status: "Pending Approval"
- Approver receives push notification with: quote summary (total value, margin %, profit EGP), customer context (tier, history, strategic importance), rep's justification note ("Strategic account, competitor priced at EGP X"), one-click `[Approve]` `[Reject]` `[Request Changes]`
- Approval logged with timestamp for audit
- Escalation: if not approved within 2 hours, escalates to next level
- Rep can add urgency note: "Customer deciding today"

#### Step 9: Preview Before Sending
- PDF preview in elevated glass modal
- Professional branded layout: HyperQuote logo, digital company stamp (ختم الشركة), quote number, date
- Customer-facing view: NO cost column, NO margin column -- only sell price
- Line items, subtotal, delivery charges, VAT 14% line, grand total (VAT-inclusive)
- Payment terms, delivery terms, validity period
- Standard terms and conditions in Arabic
- Contact information and signature block
- Toggle: "Show spec details" vs "Summary view"
- Personalized cover note field

**Document includes:**
- Seller: company name (Arabic), CR number, TRN, address, logo, digital stamp
- Buyer: company name, TRN, contact person
- Quote metadata: reference number, date, validity period
- Line items: product name (bilingual), SKU, UOM, quantity, unit price (ex-VAT), line total
- Delivery: separate line, area/governorate, terms (DAP or Franco site)
- Subtotal, VAT 14%, Grand total (VAT-inclusive)
- Payment terms explicit
- Price disclaimer: "Prices valid for [X] days. Subject to supplier cost changes for volatile materials."

#### Step 10: Send to Customer
- Send via: `[Portal]` (preferred) `[Email (PDF)]` `[Both]`
- Recipient selection: primary contact pre-selected, option to CC additional contacts
- Schedule send: "Send at 8 AM tomorrow" option
- Upon sending: status -> "Sent", soft reservation created for quote validity period, activity logged, follow-up reminder auto-scheduled (3 days), WhatsApp + email notification to customer

**Partial quotes:** Customers prefer 80% of the quote immediately over waiting. Items without pricing show "Price on Application -- we'll update within [X hours]". When remaining prices arrive, quote auto-updates, customer notified via portal + WhatsApp.

### 1.5 Quote Negotiation View

Displayed when a sent quote enters negotiation (customer counters).

**Version Timeline (horizontal, top):**
- Each version: date, author (rep or customer), total amount, margin % (rep versions only)
- Visual line connecting versions chronologically
- Click any version to view its full detail

**Side-by-Side Comparison (main area):**
- Left: Your latest version. Right: Customer's counter-offer.
- Per line item: material, your price, their requested price, delta (highlighted)
- Totals at bottom: total amount, margin %, profit EGP
- Differences highlighted: green (customer accepted your price), red (customer wants lower), gray (unchanged)

**Negotiation Conversation (below comparison):**
- Chronological thread: quote sent events, customer counter-offers (with quoted text), internal notes (flagged as internal-only, not visible to customer), system events (quote viewed X times)
- Add note, add internal note buttons

**What-If Calculator (right sidebar):**
- Input: "If I drop total by EGP [X]" or "If I drop margin to [Y]%"
- Output: new total, new margin %, new profit, approval needed (YES/NO)
- "If customer counters -5%" scenario pre-calculated

**Actions:**
- `[Revise Quote]` -- opens quote builder with current version pre-loaded, increments version
- `[Accept Customer Counter]` -- accepts their proposed prices. Confirmation prompt: "Accept counter-offer of EGP X? Margin: Y%. This will convert to an order." Requires approval if below floor.
- `[Mark as Won]` -- manual win if confirmed verbally. Triggers order creation.
- `[Mark as Lost]` -- requires reason: price too high, lead time too long, spec mismatch, competitor won, no response, project cancelled. Optional competitor name and intelligence.
- `[Add Note]` `[Call Customer]` `[Send Message]`

**Quote-to-Order Conversion (on acceptance):**
- Elevated glass confirmation dialog:
  - Creates Sales Order (SO-XXXX)
  - Auto-generates Purchase Orders to suppliers (one PO per supplier)
  - Creates delivery schedule based on lead times
  - Notifies operations team
  - Generates proforma invoice
  - Optional: request advance payment
  - Customer PO number field (required if customer provided one)
- `[Convert Now]` button triggers cascade. All downstream objects created automatically.
- For phone-confirmed orders: sales rep clicks `[Confirm Order]` directly (no customer portal accept needed). The phone call IS the acceptance.

### 1.6 Customer 360 View

Everything about one customer on a single screen. Accessed from any customer name link throughout the app.

**Header:** Company name, tier badge, address, founded date, employee count estimate, account manager name.

**Tabs:** `[Overview] [Contacts] [Quotes] [Orders] [Financials] [Projects] [Communications] [Documents] [Notes]`

**Overview Tab:**
- Account Health Score: composite 0-100 with bar visualization. Factors: payment history, order frequency, revenue trend, relationship depth, quote win rate, recent activity. Color: green (>70), yellow (40-70), red (<40).
- Key Metrics card: lifetime value, orders (12mo), revenue (12mo), avg margin, avg order size, win rate, open quotes count + value. All numbers in Geist Mono.
- Credit & AR card: credit limit, current balance, available, overdue, avg days to pay.
- Key Contacts card: top 3-5 contacts with name, role, last contact date. `[+Add Contact]` button.
- Recent Activity Timeline: chronological feed of all interactions (RFQs, quotes, orders, deliveries, payments, calls, meetings, notes).

**Contacts Tab:**
- Table: name, role, email, phone, last contact date, communication preference (phone/email/WhatsApp)
- Expand row: relationship strength (strong/developing/new), role in deals (decision maker/budget holder/influencer/end user/gatekeeper), personal notes
- Org chart visualization: customer's decision-making hierarchy with our contacts mapped to theirs
- `[+Add Contact]` button

**Quotes Tab:**
- Table: quote number, date, value, margin, status (Won/Lost/Expired/Active/Negotiating), linked project
- Filter by status, date range
- Win/loss analysis: total won vs lost, reasons for losses, competitor intelligence

**Orders Tab:**
- Table: order number, date, value, status, delivery status, payment status
- Drill into any order for full detail

**Financials Tab:**
- Credit limit history (with change reasons)
- AR aging for this customer: current, 1-30, 31-60, 61-90, 90+ days
- Payment history: each payment with method (wire/cheque/LC), date, amount, matched invoice
- Average days to pay trend

**Projects Tab:**
- Active construction projects
- Project stage (planning, foundation, structure, finishing)
- Material requirements per phase
- Cross-sell opportunities flagged by AI

**Communications Tab:**
- All calls, emails, meetings, WhatsApp messages logged
- Searchable by keyword
- Calendar integration: upcoming meetings

**Documents Tab:**
- All quotes, invoices, delivery notes, BOLs, certificates, contracts for this customer
- Upload capability for manual documents

**Notes Tab:**
- Free-form notes with timestamps and author
- Taggable: quote-related, order-related, general

### 1.7 "Add Customer" Button (Guest Order Flow)

**Scenario:** Customer calls HyperQuote, never visited the website. Sales rep creates the customer from a phone call.

**Location:** Top of the Sales module window, always visible. Button: `[+ Add Customer]`

**Minimum fields (elevated glass form):**
1. Phone number (required, Egyptian format +20 XXX XXXX XXXX, validated)
2. Company name (required)
3. Contact name (required)
4. Delivery address (optional)
5. Project name (optional)
6. Notes (optional)

**Validation:**
- Phone number: format check, duplicate check ("This number already exists -- view customer?")
- Company name: fuzzy duplicate check against existing customers ("Did you mean Al-Nour Construction?")

**System behavior on submit:**
- Creates `customers` record with `status: unclaimed`, `auth_user_id: NULL`
- NO auth credentials created -- no password, no login, no Supabase auth user
- Customer is immediately available for quoting and ordering
- The order proceeds normally: quote -> confirmation -> delivery -> payment
- Sales rep is auto-assigned as account owner

**When customer claims their account later:**
1. Customer visits portal, taps "Sign Up"
2. Enters phone number
3. System finds unclaimed record, shows masked hint: "A**** C****" ("Is this your company?")
4. Customer confirms, OTP sent to phone
5. OTP verified, Supabase Auth creates auth user
6. System links: `customers.auth_user_id = auth.uid()`, `status = 'claimed'`
7. Customer sees ALL previous order history (phone orders + future portal orders) because `customer_id` never changed
8. Sales rep notified: "Ahmed at Al-Nour Construction claimed their account"

**New customer credit awareness:** Yellow indicator on all views: "New Customer -- No credit established." Awareness only, does NOT block quoting. Reminds rep that credit application needed before fulfillment if quote converts.

### 1.8 Pipeline / Kanban View

**View toggles:** `[Kanban Board]` `[List View]` `[Funnel Chart]`
**Scope toggle:** `[My Pipeline]` `[Team Pipeline]` (manager only)

**Kanban columns (9 stages):**
1. RFQ Received
2. Reviewing
3. Sourcing (procurement getting prices)
4. Quoting (building the quote)
5. Sent to Customer
6. Negotiating
7. Closing (verbal yes, converting)
8. Won
9. Lost / Expired

**Each card:**
- Customer name + tier badge
- Deal value (Geist Mono)
- Stage-specific status text ("Waiting supplier cost", "Counter received", "Final revision")
- Days in current stage
- Win probability %
- Assigned rep avatar
- Color: green (on track), yellow (aging), red (at risk/overdue)

**Actions:**
- Click card → side panel with full deal details + `[Advance to Next Stage]` button with required validation fields (e.g., "Quote Sent" must confirm send method). Click-to-advance is primary (safer for B2B — accidental drags costly).
- Drag-and-drop between columns available for power users. Confirmation modal on critical transitions (Won/Lost).
- Filter by: rep (avatar row at top), customer (search), value range (<100K, 100-500K, 500K-1M, >1M), age in stage. Active filters as removable pills.
- Group by: rep, customer, product category. Save filter sets as named views.

**Pipeline summary bar (top):**
- Total pipeline (unweighted), weighted forecast (value × probability per stage), target, gap
- All Geist Mono
- Collapsible analytics panel below: conversion rate per stage, avg time in each stage

**Aging alerts (bottom):**
- Quotes sent >7 days with no response
- RFQs >24h without quote started
- Days counter on cards: green (<5d), yellow (5-15d), red (>15d)

### 1.9 Activity Feed, Calendar, Contacts, Reports

**Activity Feed:** Chronological stream across all accounts. Filter by type. Click-through to entities. Real-time.

**Calendar:** Week/day/month view. Event types color-coded: blue=customer meetings, green=site visits, orange=quote deadlines, red=overdue follow-ups, purple=internal meetings. Events linked to customers/quotes/orders. Auto-populate pre-meeting brief.

**Contacts:** Searchable table of all contacts across all accounts. Expandable rows with relationship context. Filter by role, company, last contact date.

**Reports:**
- Revenue by period, margin by customer, margin by category, revenue vs target
- Pipeline by stage, conversion rates, deal cycle time, win/loss analysis
- Activity metrics: quotes sent per rep, response time, follow-up rate
- Forecast: weighted pipeline, forecast vs actual trend
- Date range, rep, customer tier filters
- `[Export CSV]` `[Email Report]`

### 1.10 Sales Module Keyboard Shortcuts (when Sales window is focused)

| Shortcut | Action |
|----------|--------|
| `N` | New RFQ / New Quote |
| `G` then `I` | Go to RFQ Inbox |
| `G` then `P` | Go to Pipeline |
| `G` then `C` | Go to Customer 360 (prompts search) |
| `/` | Focus search within Sales |
| `?` | Show shortcuts help |

---

## MODULE 2: PROCUREMENT

**Primary users:** Buyers, Category Managers, Vendor Relations
**Hotkey:** `P`
**Role visibility:** Procurement roles only. Sales can view (read-only) supplier pricing status for their quotes.

### 2.1 Procurement Home View

**Tabs:** `[Home] [Supplier Inquiries] [Price Comparison] [PO Management] [Supplier Directory] [Supplier Scorecard]`

**Home content:**
- Pending inquiries to send out (count, deadline urgency)
- Price responses received needing review (count, linked quotes)
- Active POs by status: confirmed, in production, shipped, partially received
- Supplier performance highlights: best/worst performers this month

### 2.2 Supplier Inquiry Builder

**Triggered when:** Sales requests pricing, or procurement proactively sources.

**Form (elevated glass):**
- Linked quote reference
- Response deadline (date picker)
- Items to inquire (auto-populated from quote, editable)
- Per item: suggested suppliers (system suggests based on category match, past history, performance score, geographic proximity)
  - Each supplier shows: name, on-time delivery %, last price for this item, recommendation status
  - Checkbox to include/exclude
  - `[+ Add Supplier]` to add unlisted supplier
- Inquiry message template (editable): material specs, quantities, delivery location, required-by date, response deadline
- Send via: `[Email]` `[Supplier Portal]` `[WhatsApp]`
- `[Send to All Selected Suppliers]` button

**Templates:** Standard Price Inquiry, Urgent Inquiry, Repeat Order, Project-Based, Negotiation Follow-Up. Variable fields auto-populated.

### 2.3 Response Tracking

**Table:** supplier name, sent date, status (Sent/Opened/Responded/Overdue), response date, action
- Status indicators: gray=sent, blue=opened, green=responded, red=overdue
- `[Remind]` button for non-responders
- `[Send Reminder to All Non-Responders]` bulk action
- Auto-reminder at 24h before deadline (configurable)
- `[Close Inquiry & Proceed with Available]` to move forward without stragglers

### 2.4 Price Comparison Matrix

**Per line item:**
- Table: supplier, unit price, lead time, availability (full/partial with quantity), total, certification status, ranking
- Color tags: green=best price, blue=fastest, yellow=partial availability
- Historical context: last 5 purchases of this item (supplier, price, delivery performance)
- Ranking algorithm: price (40%) + full availability (25%) + lead time vs deadline (20%) + reliability score (15%)
- One-click selection: choose supplier per item
- Split option: source one item from multiple suppliers
- After selection: auto-calculates margin based on internal cost + buffer

### 2.5 PO Management

**PO List:** table with PO number, supplier, value, status, items count, expected delivery, actual delivery
**Status flow:** Draft -> Sent -> Confirmed -> In Production -> Shipped -> Partially Received -> Received -> Inspected -> Closed

**PO Detail:**
- Line items with quantities, prices, specs
- Delivery tracking: expected date, shipping notifications, tracking reference
- Receipt status: received vs expected per item
- Three-way match status: PO vs Receipt vs Supplier Invoice (green checkmark when matched)
- Documents: PO PDF, supplier confirmation, BOL, supplier invoice, inspection reports
- Activity log: all status changes with timestamps

**Auto-generated PO includes:**
- PO number, supplier details, line items, delivery address (coded reference for drop-ship, not customer company name), required delivery date, payment terms, quality requirements, reference to internal SO

### 2.6 Supplier Scorecard

**Per supplier:**
- On-time delivery rate
- Order fill rate (quantity accuracy)
- Quality rejection rate
- Price competitiveness (vs market)
- Response time to inquiries
- Overall score: 1-5 stars
- Trend arrows (improving/declining)
- Tiering: Preferred (skip-lot inspection) -> Approved (AQL sampling) -> Conditional (tightened inspection) -> New (100% inspection)

### 2.7 Procurement Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `N` | New Supplier Inquiry |
| `G` then `I` | Go to Inquiries |
| `G` then `P` | Go to PO List |
| `G` then `S` | Go to Supplier Directory |

---

## MODULE 3: ORDERS / OPERATIONS

**Primary users:** Operations Manager, Logistics Coordinator, Warehouse Manager
**Hotkey:** `O`

### 3.1 Fulfillment Kanban Board

**Main view:** Kanban columns representing order fulfillment stages:

| Column | Meaning |
|--------|---------|
| PO Placed | Supplier POs sent, awaiting confirmation |
| In Transit from Supplier | Goods shipped by supplier |
| At Warehouse | Received, inspected, ready for consolidation |
| Preparing / Loading | Being picked, staged, loaded |
| Out for Delivery | On truck, in transit to customer |
| Delivered | POD confirmed |

**Each card:**
- Order number, customer name, total value (Geist Mono)
- Item count + ready count ("3 of 5 items ready")
- ETA / delivery date
- Color: green=on track, yellow=at risk (behind schedule), red=problem (delay, damage)
- Drag between columns for manual status update (with confirmation)

**Filters:** customer, date range, delivery method, status
**Calendar view toggle:** see deliveries on a timeline

### 3.2 Order Detail

- Full order information: SO number, customer, quote reference, value, status
- Per-line-item status: item, supplier, PO number, status (Pending PO / PO Sent / Confirmed / Manufacturing / Shipped / Received / Ready / Delivered), ETA
- Overall progress bar: X% complete
- Timeline: visual Gantt-style with milestones
- Documents: all generated documents (invoice, proforma, delivery note, POs)
- Activity log: every status change with timestamps

**Actions:**
- `[Schedule Delivery]` -- opens dispatch scheduling
- `[Split Delivery]` -- send ready items now, remaining later
- `[Hold Order]` -- with reason (credit hold, customer request, stock issue)
- `[Cancel Order]` -- confirmation with reason, triggers PO cancellation, reservation release

### 3.3 Delivery Schedule

- Calendar/timeline view of upcoming deliveries
- Per delivery: order number, customer, items, method (own fleet/3PL/drop-ship), scheduled date, status
- Drag to reschedule
- Options per delivery: full delivery (wait for all items), partial delivery (ship ready items), direct ship (from supplier), consolidated (multiple orders to same customer)

### 3.4 Operations Dashboard (Home View)

Operations Manager's command center. This is the default view when the Orders/Operations module opens — displayed INSIDE the glass window, not a separate dashboard.

**Top strip (4 metric cards in a horizontal row, gap 16px):**
Each card: `var(--color-card)` bg, rounded-xl, p-16px, border 1px `var(--color-border)`. Height 80px. Flex column.
- **Orders in progress:** count (Geist Mono 600 24px) + trend arrow (Lucide `TrendingUp` or `TrendingDown` 14px, green/red) + "vs last week" (Inter 400 11px muted).
- **Deliveries today:** "X / Y" completed vs total (Geist Mono 500 20px). Progress bar below (4px height, `var(--color-primary)` fill).
- **SLA breaches active:** count (Geist Mono 600 24px, `var(--color-error)` if > 0). "0" in `var(--color-success)`.
- **Bottleneck alert:** stage name (Inter 500 14px) + stuck count (Geist Mono 400 12px). E.g., "Warehouse: 7 stuck". If no bottleneck: "All clear" in `var(--color-success)`.

**Bottleneck View (below metrics, mt-24px):**
- Horizontal pipeline visualization: Procurement → Warehouse → Dispatch → Delivery. Each stage is a rounded-lg container (flex-1, min-width 180px) connected by arrows (Lucide `ChevronRight` 16px muted).
- Per stage: item count (Geist Mono 500 16px), avg time in stage (Geist Mono 400 12px muted, e.g., "avg 4.2h"), stuck items count (items > 24h in stage, shown in `var(--color-error)` if > 0).
- Click any stage → filtered list below updates to show only orders stuck in that stage. Each row: order number (Geist Mono), customer name (Inter 500), time in stage (Geist Mono, red if > SLA), reason (Inter 400 muted), assigned person (Inter 400). Row click → navigates to Order Detail (3.2).

**SLA Tracker (below bottleneck, mt-24px):**
- Table (React Aria `Table`):
  - Columns: Entity (order/quote ref), SLA Type (Inter 400), Deadline (Geist Mono), Time Remaining (Geist Mono), Status badge.
  - SLA types tracked: Quote response (4h), PO confirmation (24h), Delivery scheduling (48h before promise date), Invoice generation (24h post-delivery), Dispute resolution (72h).
  - Status badges: "On Track" (green), "At Risk" (yellow, 25-50% time remaining), "Breached" (red, 0% or past deadline).
  - Time remaining color: green (> 50% time left), yellow (25-50%), red (< 25% or breached).
  - Sorted by urgency: breached first, then at-risk, then on-track.
  - Filter: SLA type dropdown, status dropdown, date range.

### 3.5 Cross-Module Handoff Status

Per-order visual pipeline showing which internal module currently owns the order.

- Layout: horizontal step indicator (similar to quote builder steps). Stages: Sales (quote) → Procurement (POs) → Warehouse (receiving) → Dispatch (scheduling) → Driver (delivering) → Finance (invoicing).
- Current stage: blue filled circle + bold label. Completed stages: green checkmark. Future stages: gray outline.
- Below the pipeline: current owner name + time in current stage (Geist Mono).
- Stuck handoffs highlighted: amber/red warning banner below the pipeline. E.g., "Waiting on Warehouse for 3 hours (SLA: 2 hours)" with `var(--color-warning)` bg if at risk, `var(--color-error)` bg if breached.
- "Nudge" button (Lucide `Bell` 16px + "Nudge" text, outline, 32px) sends an in-app notification to the responsible person in the blocking module.
- Accessible from Order Detail (3.2) as an expandable section at the top.

---

## MODULE 4: WAREHOUSE

**Primary users:** Warehouse Manager, Workers, Forklift Operators, Lead/Checker, Cycle Count Supervisor
**Hotkey:** `W`
**Phase dependency:** Module becomes active at Phase 2 ($5-10M) when HyperQuote starts holding inventory. Before that, only the "Receiving" section is used for cross-dock operations.
**Device targets:** Desktop (manager), ruggedized Android (Zebra TC52/TC72, Honeywell CT60) for workers. Large touch targets (minimum 48dp, ideally 64dp -- gloves). High contrast. Minimal text entry. Audio/vibration feedback for scans.

### 4.1 Warehouse Home View

**Worker view:** Large tile grid (3x3) with task counts as badges:

| Tile | Label | Badge = pending tasks |
|------|-------|-----------------------|
| 1 | Receive (RCV) | POs arriving today |
| 2 | Putaway (PUTWY) | Items awaiting putaway |
| 3 | Pick (PICK) | Orders to pick |
| 4 | Load (LOAD) | Trucks to load |
| 5 | Count (COUNT) | Cycle counts assigned |
| 6 | Transfer (XFER) | Transfer requests |
| 7 | Lookup | -- |
| 8 | Returns | Returns awaiting receipt |
| 9 | Alerts | Critical alerts count |

- Numeric shortcuts: worker types "1" for Receive, "2" for Pick, etc. (scanner keypad)
- Badge colors: red=urgent/overdue, yellow=due today, green=ahead
- Bottom: top 3 critical alerts (expiring lots, below-minimum stock, incoming deliveries)

**Manager additions (below worker tiles):**
- KPIs: pick accuracy %, on-time shipment %, receiving cycle time, inventory accuracy %
- Labor: workers clocked in / total, forklift ops available
- Tasks completed / total today
- Pending approvals count (count variances, damage dispositions, transfer requests)
- Inventory value: total on-hand, reserved, available, on-hold/damaged (all Geist Mono)

### 4.2 Receiving -- Expected Deliveries List

**List of POs expected today**, sorted by ETA:
- Each card: PO number, supplier name, ETA (Geist Mono), truck type (flatbed/enclosed/dump/pneumatic), line items summary, receiving status, assigned dock/yard area
- Status dots: gray=scheduled, blue=confirmed, green=in transit, orange-pulse=arrived, yellow=receiving in progress, green-check=complete
- Filter: status, supplier, product type, date
- `[+ Unscheduled Delivery]` button for walk-ins

### 4.3 Active Receiving (Standard Materials)

**Per PO, step-by-step:**

1. **Truck info:** truck type, license plate, BOL number (scan or manual entry), driver name
2. **Per line item:**
   - Material name, specification, expected quantity (Geist Mono)
   - Received quantity input (large number input, Geist Mono)
   - Automatic variance: green=matches, yellow=within tolerance (+-2%), red=exceeds tolerance
   - Condition dropdown: Good, Minor Damage, Major Damage, Rejected
   - Lot/Heat number: scan from bundle tags (critical for steel traceability)
   - Auto-suggested putaway location (based on product type zone rules, capacity, FEFO positioning, weight limits). Worker can override.
   - `[Photo]` button for damage documentation
   - `[Note]` button for discrepancies

3. **Discrepancy section (auto-populates when received != expected):**
   - Variance quantity
   - Reason code: Supplier Short, Damaged in Transit, Wrong Product, Wrong Specification, Overshipment
   - Photo requirement for discrepancies

4. **Material-specific quality checklist:**

| Material | Checklist |
|----------|-----------|
| Cement | Bags intact (no hardness/lumps), manufacture date, pallet condition, shrink wrap, type matches PO |
| Steel/Rebar | Rust level acceptable, sizes/lengths match, grade stamps visible, bundle tags intact, Mill Test Certificate received, no excessive bending |
| Lumber | Grade stamps, no excessive warping/splitting, moisture content, tally count by dimension, species matches |
| Aggregates | Weigh ticket matches, visual quality (no contamination), material type matches |
| Pipe | No cracks/dents, diameter/schedule matches, lengths correct, ends undamaged |
| Roofing | No heat/sun damage, packaging intact, lot numbers match |
| Insulation | No water damage, packaging intact, R-value/thickness matches, not compressed beyond recovery |

5. **Completion:**
   - Digital signature (drawn on screen)
   - `[Complete Receiving]` -- all items accepted with noted exceptions
   - `[Reject Delivery]` -- entire load fails inspection. Requires supervisor override + reason + photos.

### 4.4 Active Receiving (Bulk/Weight-Based Materials)

For aggregates, sand, gravel sold by weight:

- Material name, PO quantity (tons)
- Truck gross (loaded) weight input (Geist Mono)
- Truck tare (empty) weight input
- Auto-calculated net weight + unit conversion (lbs to tons or kg to tonnes)
- Running total against PO (aggregates often delivered in multiple loads): previously received + this load + remaining
- Quality: contamination check, material type verification
- Dump location selection from yard zone map
- Weigh ticket scan or photo
- `[Confirm Receipt]`

### 4.5 Putaway

**System-directed, task-by-task:**

- Task X of Y indicator
- Product name, quantity, lot number, manufacture date, expiry date (prominent for shelf-life items)
- FROM: staging dock/location
- TO: system-suggested optimal location (based on zone rules, capacity, FEFO positioning, weight limits)
- **Two-scan confirmation:** 1) Scan source location barcode, 2) Scan destination location barcode
- Quantity placed (for partial putaway)
- Override option: `[Override Location]` with mandatory reason (Location Full, Blocked, Equipment Issue) and alternate location scan
- Next task preview at bottom for continuous workflow

### 4.6 Pick List (Order Queue)

**Orders sorted by shipping deadline:**
- Priority color: red=ship within 2h, yellow=ship today, green=tomorrow+
- Each card: SO number, customer, shipping time (Geist Mono), assigned truck/route, item count, total weight (Geist Mono)
- Weight displayed prominently (critical for truck capacity)
- Filter: route, truck, priority, product type
- Tap to start directed picking flow

### 4.7 Directed Picking (Step-by-Step)

**Per item in the order:**

1. **Navigate:** "GO TO: WH-A / CEMENT / ROW-2 / Bay 04 / Floor Level" with optional aisle direction arrows
2. **Product info:** name, SKU, lot (FEFO enforced -- system directs to oldest lot first, will NOT allow picking newer lot when older has sufficient quantity), expiry date, quantity to pick
3. **Two-scan verification:**
   - Scan location barcode (confirms worker is at correct spot)
   - Scan product barcode (confirms correct product)
4. **Quantity entry:** for partial pallet picks (e.g., 15 bags off 42-bag pallet)
5. **Exceptions:**
   - `[Short Pick]` -- location has less than needed. Pick available, system redirects to next location with same product.
   - `[Skip Item]` -- cannot access (blocked, equipment issue)
   - `[Substitute]` -- system suggests configured substitutes
6. **Running weight tracker:** cumulative load weight vs truck capacity with visual progress bar (e.g., "37,500 lbs / 48,000 lbs -- 78%")
7. `[Confirm Pick]` -- advances to next step

### 4.8 Staging and Load Verification

**Load plan organized by delivery stop (LIFO -- last stop loaded first):**

Per stop section:
- Stop number, items list
- Each item: checkbox + "Scanned" / "Awaiting scan" status
- Scan each item barcode as loaded onto truck

**Weight check section:**
- Loaded weight (running total, Geist Mono)
- Truck max capacity
- Remaining capacity
- Visual bar (like pick weight tracker)

**Loading sequence alerts:** warn if loading order violates weight distribution (heavy items must go before light items)

**Load completion (5-step gated flow on tablet):**
1. Scan truck ID barcode
2. Scan items onto truck (progress bar: "18 of 22 scanned"). Remaining items list with checkmarks.
3. Verify weight on scale: "Expected: 18,500 kg | Actual: 18,340 kg | Variance: 0.9% [GREEN - WITHIN TOLERANCE]"
4. Capture photos: `[Rear Photo]` `[Side Photo]` `[Seal Photo]` (minimum required configurable)
5. Sign-off: driver + loader signatures (dual signature pad) + `[Gate Clearance]`

**Hard gating:** Missing items, weight variance >tolerance, required photos missing = BLOCKED departure with manager override option. `[BLOCKED - Resolve Issues]` shown in red.

**On clearance:** `[Generate BOL]` auto-generates Bill of Lading. Triggers: outbound inventory state change, delivery tracking activation, customer notification.

### 4.9 Cycle Count (Blind Count Process)

**Step-by-step:**

1. Worker sees assigned count: location, count X of Y
2. `[Scan Location to Start]` -- confirms worker is at correct location
3. **Blind count: system quantity is HIDDEN.** Worker does not see expected count to prevent bias.
4. Per product at this location: worker enters physical count (large number input, Geist Mono)
5. `[+ Add Unexpected Product]` -- for items found at location but not expected by system
6. `[Submit Count]`

**After submission:**
- System reveals: system qty, worker count, variance, variance %
- Threshold check by ABC class: A items >2% = recount, B items >5% = recount, C items >10% = recount
- If within threshold: auto-approved, count recorded
- If exceeds threshold: "Recount Requested" -- must be done by a DIFFERENT worker for objectivity
- If recount confirms variance: escalates to supervisor for approval

**Supervisor Count Approval:**
- Location, product, system qty, initial count, recount, variance, variance %
- Last movements list (recent picks, receives) for investigation
- Reason code selection: Receiving error, Pick error, Damage (unrecorded), Theft, Miscount, Location error
- Financial impact: value of adjustment (Geist Mono)
- `[Approve]` `[Investigate Further]`

### 4.10 Inventory Lookup

- Search by scan (any barcode: product, lot, location) or type (SKU, name, lot number)
- Shows inventory across ALL locations/bases with drill-down
- Per location: lot number, expiration date with days remaining (Geist Mono), on-hand/reserved/available breakdown, condition status
- Multi-base summary at bottom
- In-transit and on-order quantities
- Movement history (recent transactions)
- Reorder point status with days-of-supply calculation
- Product photo for visual identification

### 4.11 Yard Management

- Interactive visual map of yard layout
- Zones color-coded by capacity utilization (green <60%, yellow 60-80%, red >80%)
- Tap zone for detail: inventory summary, last activity, capacity
- Aggregate bins: estimated quantities (last measurement + inflows - outflows)
- Weather alert integration: rain/wind/temperature warnings with actionable recommendations ("Cover lumber zone?", "Tarp aggregate bins?")
- Khamsin dust storm alert: auto-pause outdoor operations above 30 km/h wind, block sheet material deliveries
- Zone editing (supervisor/manager): reconfigure layout

### 4.12 Other Warehouse Screens

**Returns Receipt & Inspection:** Receive returns against RMA. Inspect per material-type checklist. Disposition per item: Restock Grade A, Restock Discounted (to clearance), Return to Vendor, Scrap/Dispose, Hold for Investigation. Photo documentation mandatory for damaged returns. Credit note auto-generated or flagged for finance review.

**Damaged Goods / Quarantine:** Central view of all quarantined items. Sources: receiving failure, cycle count discovery, approaching expiration (auto-triggered), forklift damage, customer return. Disposition: release, sell as-is (markdown), return to supplier, scrap (write-off), rework. Write-off value calculated. Manager approval for dispositions above threshold.

**Inter-Base Transfer:** From base, to base, items, lots (FEFO), quantities, reason, priority. Manager approval required for inter-base. Freight cost estimate. Transfer tracked like mini-shipment with states: Submitted -> Approved -> Pick at Source -> In Transit -> Received at Destination -> Complete.

**Reports & KPIs (manager):** Inventory accuracy, order fill rate, pick accuracy, receiving cycle time, on-time shipment, inventory turnover. Report library: inventory valuation, aging by lot, slow-moving, damage/write-off, receiving performance, count accuracy trend, utilization, transfer history, returns analysis, worker productivity. Date range + base filters. Export CSV, email report.

### 4.13 Warehouse Keyboard Shortcuts (desktop)

| Shortcut | Action |
|----------|--------|
| `1`-`9` | Navigate to tile (scanner keypad) |
| `G` then `R` | Go to Receiving |
| `G` then `P` | Go to Picking |
| `G` then `C` | Go to Cycle Count |
| `G` then `Y` | Go to Yard Map |

---

## MODULE 5: FINANCE

**Primary users:** Controller, AR Clerk, AP Clerk, Credit Manager, CFO
**Hotkey:** `F`

### 5.1 Finance Home View

**Tabs:** `[Home] [Invoicing] [AR] [AP] [Payments] [Credit] [Bank Reconciliation] [Reports]`

**Home content:**
- Key metrics bar: Revenue MTD, Outstanding AR, Overdue AR, Cash Position (all Geist Mono)
- AR Aging summary: Current, 1-30, 31-60, 61-90, 90+ with amounts
- Expected payments this week: customer, amount, method, due date
- Payment method breakdown: Wire %, Cheque %, LC %
- Customer credit utilization: top customers approaching limits
- AP due this week + overdue AP
- Margin tracking: avg margin MTD, highest/lowest margin deals

### 5.2 Invoicing

**Auto-generated from delivery confirmation.** When dispatcher marks "Delivered" with valid POD, invoice generates automatically.

**Invoice includes:**
- Seller: company name (Arabic), CR number, TRN, address, logo, digital stamp (ختم الشركة)
- Buyer: company name, TRN, contact person
- Invoice number, date, due date (based on payment terms)
- Line items: product name (bilingual), EGS/GPC code (required for ETA), UOM, quantity, unit price (ex-VAT), line total
- Delivery charges as separate line
- Subtotal, VAT 14%, Grand total (VAT-inclusive)
- Payment terms, bank details for wire transfer
- Digitally signed (HSM or ITIDA software-based) for ETA e-invoicing compliance

**ETA E-Invoicing submission:** Every invoice submitted in real-time to Egyptian Tax Authority API in JSON/XML format. Both seller and buyer TRN (9-digit) required. System validates all required fields before submission. Failed submissions flagged for manual review.

**Invoice list:** table with number, customer, amount, date, due date, status, ETA submission status
**Statuses:** Draft -> Sent -> Viewed -> Partially Paid -> Paid / Overdue -> Collections / Disputed -> Resolved / Adjusted / Written-Off

**Actions:** `[View PDF]` `[Send to Customer]` `[Record Payment]` `[Issue Credit Note]` `[Dispute]`

**Multi-channel send (modal):**
- Checkboxes: `[x] Customer Portal` (instant) | `[x] Email` (account email) | `[ ] WhatsApp` (phone) | `[ ] Print & Mail`
- Pre-filled message template (editable). `[Send Now]` or `[Schedule for DATE]`.
- Post-send tracking per channel: "Sent [timestamp]", "Viewed [timestamp]", "Downloaded [timestamp]"

**Credit note generation:**
- Linked to original invoice. Reason: `[Goods returned]` `[Price adjustment]` `[Damaged goods]` `[Other]`
- Select affected lines from original invoice. Amount auto-calculated or manual override.
- Approval required if > configurable threshold (e.g., EGP 10,000). Auto-reverses AR on approval.

### 5.3 Accounts Receivable (AR)

**KPI Strip (top of AR view):**
- Horizontal row of 4-6 KPI cards: Total Outstanding (big number, EGP, Geist Mono 24px), DSO (Days Sales Outstanding, trend arrow vs prior period), CEI% (Collection Effectiveness Index), Overdue Amount (red-highlighted if above threshold), Current Period Collections (vs target).
- Each card: glass panel container, click to filter table below.

**AR Aging Table:**
- Columns: Customer Name | Current | 1-30 | 31-60 | 61-90 | 90+ | Total | Trend Sparkline
- All amounts in Geist Mono, right-aligned
- Color coding per DS.1 AR severity: current=green, 1-30=yellow, 31-60=orange, 61-90=red, 90+=dark red bold
- Row background shifts white → pale yellow → pale red based on worst aging bucket
- Each cell clickable — drills into invoices for that customer+bucket
- Sparkline in last column: 6-month aging trend per customer (tiny area chart, Geist Mono axis)
- Column headers show aggregate totals per bucket

**Drill-down flow (progressive disclosure):**
1. Dashboard level: summary KPI strip + aging table
2. Click aging cell → filtered invoice list for that customer in that bucket
3. Click invoice → invoice detail with payment history, communication log, dispute status
4. Breadcrumb: "AR Dashboard > 61-90 Days > ACME Corp > INV-2025-0342"

**Filtering & segmentation:**
- Filter by: customer tier, sales rep, date range, amount range, customer group
- Group by: customer, region, salesperson
- Sort by: total outstanding, oldest invoice, highest risk
- Save filter combinations as named views ("My Open Quotes", "Overdue Invoices")
- Active filters shown as removable pills. "Clear all filters" link.

**Automation:**
- Invoice overdue 30 days: auto-send reminder (WhatsApp + email)
- Invoice overdue 60 days: auto-escalate to Credit Manager + hold new orders for customer
- Invoice overdue 90 days: collections status, legal notification option

### 5.4 Payment Recording Flow

**Step-by-step for recording a received payment:**

1. **Select method:** `[Wire Transfer]` `[Cheque]` `[Letter of Credit]`

2. **Wire Transfer flow:**
   - Bank reference number (text input)
   - Amount received (Geist Mono, number input)
   - Date received (date picker)
   - Receiving bank account (dropdown of company accounts)
   - `[Match to Invoice]` -- system auto-suggests matching invoices based on customer + amount + memo. Clerk confirms matches (not data entry starting point).
   - Running balance shown live: "Payment Amount: EGP 247,500 — Applied: EGP 247,500 = Remaining: EGP 0" (updates as invoices checked/unchecked)
   - Checkboxes next to suggested invoices. Exact match: green checkmark auto-applied.
   - If amount matches invoice exactly: auto-match, one click confirm
   - If amount is partial: allocate amount across invoices. Per-invoice amount editable. "Auto-allocate FIFO" button applies oldest-invoice-first. Manual override per line.
   - If overpayment: unapplied amount shown in orange. Options: `[Apply to Next Invoice]` `[Hold as Credit]` `[Initiate Refund]`. Credit applied to next invoice automatically if "Hold as Credit" chosen.
   - `[Confirm Payment]` -- generates payment receipt PDF, updates invoice status, updates AR

   **Bank statement import (batch):** Bulk import from CSV/MT940. System parses each line for auto-matching. `[Apply All Matches]` button for bulk processing. Same auto-match logic as single payment entry.

3. **Cheque flow (Post-Dated Cheque Tracking):**
   - Cheque number (text input, required)
   - Bank name (dropdown of Egyptian banks + text input for unlisted)
   - Amount (Geist Mono)
   - Cheque date (the date written on the cheque -- may be future)
   - Payer name (auto-populated from customer, editable)
   - `[Record Cheque]`
   - **Cheque status tracking:** Received -> Deposited (on/after cheque date) -> Cleared / Bounced
   - System creates calendar reminder to deposit on cheque date
   - If **Bounced:** immediate credit hold for customer, legal notification option, Tier 5 status applied, alert to Sales and Credit Manager, increment bounced cheque count on customer profile. "Bounced cheque is a criminal offense under Egyptian law" flagged in system.
   - **Bounce handling flow:** Mark as "Bounced" → reason dropdown (Insufficient Funds / Signature Mismatch / Date Issue / Other) → auto-reverses accounting entry → adds amount back to AR → options: `[Re-present]` (set new deposit date) | `[Request Replacement]` | `[Write Off]` (requires approval) | `[Escalate]` (credit hold review). Multiple bounces → auto-triggers credit hold review.

   **PDC Grid View:**
   - Columns: # | Cheque No | Customer | Bank | Amount | Maturity Date | Status | Actions
   - Status state machine: Received (blue) → Deposited (orange) → Cleared (green). Also: Bounced (red) → Re-presented → Cleared/Written Off/Replaced.
   - Summary footer row: totals per status ("Received: EGP X | Deposited: EGP Y | Cleared: EGP Z | Bounced: EGP W")
   - Context-dependent action buttons per row: `[Deposit]` `[Clear]` `[Bounce]` `[Re-present]`

   **PDC Calendar / Maturity View:**
   - Monthly calendar with color-coded dots per due date (matching status colors above)
   - Click date → list of all cheques maturing that day
   - "Due This Week" summary bar: count + total amount + `[Act on These]` button
   - Notifications: 3 days before maturity, daily until deposited

4. **Letter of Credit flow:**
   - LC number, issuing bank, amount, expiry date
   - Document compliance checklist (LC terms vs actual documents)
   - Bank submission tracking
   - Draw-down recording

**Payment receipt generation:** On any verified payment (wire confirmed, cheque cleared, LC drawn), system auto-generates payment receipt PDF (ايصال استلام) sent to customer via portal + WhatsApp.

### 5.5 Accounts Payable (AP)

**Supplier payment tracking:**
- Invoice list from suppliers with three-way match status: PO + Receipt + Supplier Invoice
- Match status: green ✓ (all three match), yellow ⚠ (variance within tolerance 2-5%), red flag (exceeds tolerance)

**Three-way match review (side-by-side):**
- Three columns: PO | Goods Receipt | Supplier Invoice. Each line item shown side-by-side.
- Discrepancy highlighting: green cell (match) | yellow cell (within tolerance) | red cell (exceeds) | grey dash (not applicable)
- Example: Invoice price EGP 125 vs PO price EGP 120 = yellow cell + "⚠ +4.2% (+EGP 2,500)"
- Tolerance rules (configurable in Admin): Price 0-5%, Quantity 0-2%, Tax 0% (exact match), Delivery per PO terms
- Variance exceeds tolerance → auto-routes to responsible function (procurement, warehouse, finance, logistics)
- Action bar: "Match Status: 1 of 2 lines matched | Variance: EGP 2,500". Buttons: `[Approve All ✓]` `[Approve Matched Lines]` `[Dispute]` `[Hold]` `[Reject]`
- Dispute → modal with reason dropdown + note to supplier
- Payment schedule: when each supplier invoice is due
- Withholding tax tracking: gross amount, 1% withholding, net payment (all Geist Mono)
- Withholding tax certificate generation (sent to supplier)
- Quarterly withholding remittance to ETA via Form 41

**AP Aging:** Current, 1-30, 31-60, 61-90, 90+ days payable to suppliers

### 5.6 Credit Management

**Customer credit profile card:**
- Header: Customer name (bold), Tier badge (Gold/Silver/Bronze ★), Status badge (`[● Active]`)
- Credit Limit: big number (Geist Mono 20px)
- Utilization bar: color-coded gradient (0-60% green, 60-80% yellow, 80-95% orange, 95-100% red, >100% pulsing red + "OVER LIMIT" badge). Width represents usage, color shows risk at a glance.
- Available credit, overdue amount (with invoice count), Payment Score (0-100, Geist Mono), Avg Days to Pay, Bounced Cheques (12mo), Last Payment date
- Quick actions: `[Hold Orders]` `[Adjust Limit]` `[Review]`
- Credit application workflow: customer applies → D&B/Experian scoring → finance sets limit → auto-check on every order
- Auto-hold triggers: (1) Credit limit exceeded, (2) Days overdue >30, (3) Overdue >X% of limit, (4) Bounced cheque count exceeds threshold, (5) Credit limit expired. Hold → blocks new orders → `[Release with Approval]` `[Release One-Time]` `[Escalate]`
- Credit limit change history with approval trail
- New customer defaults: 50% advance + 50% COD by certified bank cheque
- Net terms granted only after 2-3 successful cash transactions + credit application

**Credit review & limit increase:**
- Current limit + requested limit + request date/rep
- Supporting data: 12-month payment history chart (% on-time bar), order volume trend (line chart QoQ growth), current exposure, overdue history
- AI recommendation: "Suggest EGP 650K (+30%)" based on payment pattern + growth trajectory
- Actions: `[Approve Requested]` `[Approve Different Amount]` `[Deny]` `[Defer]` + Notes field
- Auto-updates customer record + releases held orders on approval

**Credit limit approval chain:**
- Increase <20% of current: Finance Manager
- Increase 20-50%: Finance Manager + CFO
- Increase >50% or new limit >EGP 50M: Finance Manager + CFO + CEO

### 5.7 Bank Reconciliation

- Bank statement import (CSV initially, Plaid API in Phase 2)
- Auto-matching: system matches bank transactions to recorded payments by amount + date + reference
- Unmatched items highlighted for manual reconciliation
- Reconciliation status: matched, partially matched, unmatched, exception

### 5.8 Finance Reports

- Daily cash position
- AR aging (detail and summary)
- AP aging
- 13-week cash forecast
- P&L by customer / product / project
- Margin analysis (by customer tier, category, rep)
- Payment method distribution
- Cheque tracking report (all cheques by status)
- ETA e-invoice submission report (success/failure)
- Credit utilization report
- Date range, customer, category filters
- `[Export CSV]` `[Export PDF]` `[Email Report]`

### 5.9 Finance Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `G` then `I` | Go to Invoicing |
| `G` then `A` | Go to AR Aging |
| `G` then `P` | Go to AP |
| `G` then `C` | Go to Credit Management |
| `N` | Record New Payment |

---

## MODULE 6: LOGISTICS / DISPATCH

**Primary users:** Dispatcher, Logistics Manager
**Hotkey:** `D`

### 6.1 Dispatch Home View

**Tabs:** `[Home] [Route Planning] [Live Map] [Driver Management] [Delivery Log] [Reports]`

**Home content:**
- Today's deliveries: count, completed, in progress, pending
- Fleet status: vehicles available, in transit, loading, at site
- Alerts: delayed deliveries, failed deliveries, driver issues
- Weather alerts (Khamsin dust storms, rain warnings affecting sheet materials)

### 6.2 Route Planning

**Day-before planning workflow:**

1. **Pending deliveries list:** All orders ready for delivery, grouped by region/zone
2. **Assignment interface (left panel: routes, right panel: map):**
   - Left: list of drivers + routes (each with capacity bar: green <70%, yellow 70-90%, red >90%). Each route shows numbered stops with drag handles (Lucide `GripVertical`).
   - Unassigned deliveries pooled at top (order, customer, location, weight, equipment needed).
   - Drag stops within route to reorder. Drag between drivers to reassign. Map updates route lines in real-time.
   - Time windows shown as colored bars: Red if ETA outside window, Yellow if tight (within 10 min of edge).
   - `[Auto-Optimize]` button → shows before/after comparison (total distance, total time, time window violations). Dispatcher can still manually override or lock individual stops.
   - Drag delivery to driver, or click `[Auto-Assign]` for system optimization
3. **Route optimization:** system suggests optimal stop sequence using OR-Tools/GraphHopper VRP
   - Considers: distance, time windows, truck weight limits, equipment requirements, Cairo truck ban
   - Moffett-equipped trucks: 6-10 stops/day. Boom trucks: 3-6 stops/day
4. **Constraints enforced:**
   - Vehicle type must match load requirements (flatbed for steel, enclosed for cement/weather-sensitive)
   - CDL/equipment certifications checked against driver profile
   - Equipment-tagged dispatch: Moffett/boom/CDL jobs -> INTERNAL or CONTRACTED only, never ON_DEMAND
   - **Cairo truck ban: heavy trucks (5+ tons) auto-blocked 6AM-midnight in Greater Cairo. System shows alert and moves to 12AM-6AM window. Light deliveries (<5 tons) exempt.**
   - Prayer time buffers: 10-15 min around each of 5 daily prayers
   - Friday Jumu'ah blackout: 11:30 AM - 1:30 PM (no deliveries)
   - Khamsin dust storm: block sheet material deliveries above 30 km/h wind
5. **Driver assignment:**
   - Three-tier: hard constraints (vehicle/CDL/equipment) -> optimization (proximity/route/load balance) -> business rules (internal first, customer preference)
   - Auto-suggest with manual override

**Confirmation:** `[Publish Routes]` -- sends route to each driver's app, notifies customers of delivery windows

### 6.3 Live GPS Tracking Map

**Color-coded fleet map (MapLibre GL + react-map-gl, client-only with ClientOnly wrapper):**

| Color | Status |
|-------|--------|
| Yellow | Loading / Preparing |
| Green | In Transit |
| Blue | At Delivery Site |
| Checkmark Green | Delivered (confirmed) |
| Red | Problem (delay, damage, customer unavailable) |

**Vehicle pin design:**
- Moving: green circle with directional arrow showing heading
- Idle: orange/yellow circle (engine on, not moving)
- Stopped: red circle (engine off)
- No GPS / Offline: grey circle with "?" or slash
- At high zoom: pin shows vehicle icon (truck/van silhouette)
- At low zoom: pins cluster into numbered circles ("12 vehicles")

**Vehicle info popup (click on pin):**
- Vehicle ID + driver name
- Speed + heading
- Status: In Transit / At Stop / Returning
- Current stop: X of Y
- Next stop: location name + ETA (Geist Mono)
- Contact buttons: `[Call Driver]` `[Message]`
- `[View Route]` `[Details]`

**Map features:**
- All active vehicles as colored pins on the map
- Real-time position updates via Supabase Realtime Broadcast channel (GPS pings every 5s active, 15s en route, 30s idle)
- Route lines per driver (unique color per driver, solid = completed portion, dashed = remaining)
- Geofence circles around delivery sites (150-300m radius for construction sites)
- Arabic labels on map via MapTiler

**Sidebar panel (collapsible, left):**
- Hierarchical: Teams > Drivers (stop count in parentheses) > Assigned tasks
- Unassigned tasks pooled at top. Drag task to driver to assign.
- Quick filters: `[All]` `[Problems]` `[Arriving Soon]` `[Completed]`
- Each row: driver name, customer, ETA, status dot
- Search bar to find specific driver or order

### 6.4 Delivery Confirmation with POD Validation

**When driver submits POD (from driver app), dispatcher validates:**

**Deliveries list (Needs Review filter):**
- Table: Order # | Driver | Location | Time | Status Badge (Green: Delivered, Red: Issue Flagged) | POD Availability | `[Review >>]`
- Click `[Review >>]` → split view:

1. **POD Review screen (split layout):**
   - **Left panel:** Mini-map showing GPS dot (actual delivery location) vs expected address pin. Distance between shown.
   - **Right panel:** POD details:
     - Photo thumbnails (click to expand full resolution, pinch-to-zoom)
     - Digital signature image
     - GPS coordinates + timestamp (Geist Mono)
     - Item table: Expected Qty | Delivered Qty | Status per line
     - Driver notes
     - Delivery duration (time at site)

2. **Validation checklist:**
   - Photos clearly show delivered materials: YES/NO
   - Signature present and legible: YES/NO
   - Quantities match order: YES/NO
   - GPS location matches delivery address (within 500m): YES/NO
   - No damage reported: YES/NO

3. **Actions:**
   - `[Confirm Delivery]` (green) — marks as DELIVERED, triggers invoice generation in finance
   - `[Flag Issue]` (yellow) — opens exception form (partial delivery, damage, wrong items, signature issue). If quantity discrepancy: create partial delivery + schedule redelivery for remainder.
   - `[Request Re-delivery]` (red) — for failed/partial deliveries
   - `[Reject]` — sends back to driver for re-capture

**Auto-confirm rule:** If driver POD passes all automated checks (photos present, signature present, GPS match, quantities match), dispatcher can enable auto-confirm for trusted routes.

### 6.5 Driver Management

**Driver list:** name, type (Internal/Contracted/On-Demand), vehicle, CDL status, compliance status, active route, availability

**Compliance tracking (integrated with HR):**
- License expiry dates (Second/First Degree professional license for heavy trucks)
- Medical card, drug test results
- Moffett/crane certifications
- Insurance verification (monthly for contracted)
- **Expired compliance = blocked from dispatch assignment.** System will not allow assigning a driver with expired certifications.

**Contracted driver workflow:**
- Jobs offered (not assigned) with 30-min accept/decline window
- Performance scorecard: on-time rate, POD compliance, damage rate
- Weekly invoicing by contracted drivers via portal
- 5% withholding tax on services

**On-demand driver pool:**
- Available drivers who opted in
- Light loads only (no Moffett/boom/CDL jobs)
- Claimed from pool with payout shown + countdown timer

### 6.6 Dispatch Reports

- Delivery success rate (first-attempt)
- On-time delivery rate
- Average deliveries per driver per day
- Delivery cost per order
- Route efficiency (planned vs actual distance)
- Failed delivery analysis (reasons breakdown)
- Driver performance comparison
- Cairo night delivery compliance
- Equipment utilization

### 6.7 Dispatch Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `M` | Toggle Map view |
| `G` then `R` | Go to Route Planning |
| `G` then `D` | Go to Driver Management |
| `1`-`9` | Select vehicle by list position |

---

## MODULE 7: CUSTOMER SERVICE / SUPPORT

**Primary users:** CS Representatives, Claims Specialist, CS Manager
**Hotkey:** `C`

### 7.1 Support Home View

**Tabs:** `[Home] [WhatsApp Inbox] [Tickets] [Returns/Claims] [Knowledge Base] [Reports]`

**Home content:**
- Open tickets by priority: critical, high, normal, low (counts + oldest age)
- Unread WhatsApp messages (count)
- SLA status: on-track %, at-risk %, breached %
- Active returns/claims count

### 7.2 WhatsApp Inbox

**Layout:** Chat interface (similar to WhatsApp Web)

**Left panel:** Conversation list sorted by last message time
- Each conversation: customer name, last message preview, timestamp, unresolved indicator
- Filter: `[All]` `[Unread]` `[AI Resolved]` `[Needs Human]`

**Right panel:** Active conversation
- Message thread with customer messages and agent responses
- AI triage panel (top): AI classifies incoming message and suggests action
  - Tier 0 (55-75%): Auto-resolved by AI (order status, invoice lookup, stock checks). AI response sent automatically. Agent reviews.
  - Tier 1: AI suggests response. Agent reviews, edits, sends.
  - Tier 2: AI flags as complex (dispute, complaint, escalation). Human required.
- Customer context sidebar: name, order history, open quotes, outstanding invoices, recent deliveries, support history
- Quick actions: `[Check Order Status]` `[Look Up Invoice]` `[Create Ticket]` `[Escalate]`
- Response templates: common replies for frequent questions

### 7.3 Ticket Management

**Ticket list:** table with number, customer, subject, priority, status, assigned agent, SLA countdown, created date

**SLAs by priority:**
| Priority | First Response | Resolution |
|----------|---------------|------------|
| Critical | 15 min | 4 hours |
| High | 1 hour | 8 hours |
| Normal | 4 hours | 24 hours |
| Low | 8 hours | 48 hours |

**Ticket detail:**
- Customer info, linked orders/quotes/invoices
- Description, attachments (photos, documents)
- Internal notes vs customer-visible messages
- Status: Open -> In Progress -> Waiting on Customer -> Waiting on Internal -> Resolved -> Closed
- Cross-department sub-tickets: e.g., customer reports damage -> CS ticket + Operations sub-ticket (investigate) + Procurement sub-ticket (supplier claim) + Finance sub-ticket (credit note)
- Activity timeline with all actions and status changes

**Ticket taxonomy:** 50+ reason tags across 7 categories: Order, Quote, Delivery, Payment, Account, Product, Platform

### 7.4 Returns and Claims

**Damage claim flow:**
1. Customer reports damage (WhatsApp with photos typically)
2. System creates Damage Claim linked to delivery + order
3. Tier classification: Minor (<5% value, auto-approve), Moderate (5-20%, inspection within 48h), Major (>20%, third-party inspection within 24h)
4. Resolution options: partial replacement, credit note, price reduction, full replacement, full refund, return and reorder
5. Financial settlement: credit note issued, invoice adjusted, supplier claim filed (parallel), insurance claim if applicable

**Return processing:**
- RMA creation with items, quantities, reason
- Linked to warehouse receiving for inspection
- Credit note generation on completion

**NPS/Feedback:** WhatsApp survey 2 hours post-delivery, 3 questions max. Detractor rescue within 24 hours.

### 7.5 Support Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `G` then `W` | Go to WhatsApp Inbox |
| `G` then `T` | Go to Tickets |
| `G` then `R` | Go to Returns |
| `N` | New Ticket |

---

## MODULE 8: HR

**Primary users:** HR Manager, Department Managers
**Hotkey:** `H`
**Phase 1:** Profiles, attendance, driver compliance, leave, documents
**Phase 2 (30-50 employees):** Self-service, commissions, org chart, payroll integration
**Phase 3 (100+):** Performance reviews, training, recruitment

### 8.1 HR Home View

**Tabs:** `[Home] [Employees] [Driver Compliance] [Leave] [Attendance] [Documents] [Settings]`

**Home content:**
- Headcount: total, by department, new this month
- Compliance alerts: expiring driver certifications (CDL, medical, drug test, Moffett)
- Pending leave requests
- Attendance: clocked in today / total

### 8.2 Employee Profiles

**Employee directory:** searchable table with name, department, role, status (active/inactive), hire date
**Profile detail:**
- Personal info: name, phone, email, address, emergency contact, national ID
- Employment: role, department, hire date, contract type, reporting manager
- Compensation: salary, benefits, commission structure (linked to order margins for sales)
- Documents: contract (Arabic, 4 copies as required by law), national ID copy, tax card, social insurance card, professional licenses
- Leave balance: annual (15-30 days by tenure), sick, maternity (120 days up to 3x), other
- Attendance history
- Performance notes

### 8.3 Driver Compliance Tracking

**Critical integration with dispatch module.**

**Per driver:**
- Professional license: degree (First/Second/Third), number, expiry date, photo
- Medical card: expiry date
- Drug test: date, result, next due
- Equipment certifications: Moffett, crane, boom (each with expiry)
- Insurance (contracted drivers): policy number, provider, coverage, expiry

**Compliance status:** Green (all current), Yellow (expiring within 30 days), Red (expired)
**Red = dispatch block.** System automatically prevents assigning this driver to any route until resolved.

**Alerts:** 30 days before expiry: notification to HR + driver + department manager. 7 days: escalation.

### 8.4 Leave Management

**Leave request form:** type (annual, sick, maternity, paternity, study, pilgrimage, childcare, nursing), dates, reason, attachment (medical certificate for sick >3 days)

**Approval:** Manager receives notification, views team calendar for conflicts, approves/rejects with comment.

**Vacation delegation:** Employee sets "Out of Office" with delegate. Queue auto-routes to delegate. Delegation logged.

**Egyptian labor law compliance:**
- Annual: 15 days (first year), 21 days (after year), 30 days (after 10 years or age 50+)
- Maternity: 120 days, up to 3 times during employment
- Paternity: 1 day
- Sick: 180 days (75% pay first 90 days, 85% next 90)
- Mandatory 3% annual salary increase

### 8.5 Attendance

- Clock in/out (manual on platform, GPS-based for drivers)
- Working hours: 8h/day, 48h/week (6h/day during Ramadan)
- Overtime calculation: 135% day, 170% night, 200% holidays
- Weekend: Friday + Saturday (NOT Saturday + Sunday)
- Holiday calendar: 14-15 Egyptian public holidays (Islamic dates variable by moon sighting, configurable in admin)
- Ramadan mode: adjusted SLAs, shorter delivery windows, modified working hours

---

## MODULE 9: ADMIN

**Primary users:** IT Administrator, Department Managers (limited), CEO
**Hotkey:** `A`

### 9.1 Admin Home View

**Tabs:** `[Users & Roles] [Permissions] [System Settings] [Margin Rules] [Approval Thresholds] [Holiday Calendar] [Integrations] [Audit Log]`

### 9.2 Users and Roles

**User list:** name, email, role(s), status, last login, MFA status
**User detail:** profile info, assigned roles, permission set, login history, device sessions

**Role management:** 25+ predefined roles. Each role maps to a set of permissions.
**Key roles:** CEO, Admin, Sales Manager, Account Manager, Inside Sales, Quoting Specialist, Procurement Manager, Buyer, Category Manager, Ops Manager, Logistics Coordinator, Warehouse Manager, Warehouse Worker, Forklift Operator, Lead/Checker, Cycle Count Supervisor, Controller, AR Clerk, AP Clerk, Credit Manager, Dispatcher, CS Rep, Claims Specialist, HR Manager, IT Admin

**Permission principles:**
- Unauthorized elements are HIDDEN, not disabled
- Frontend checks are UX only -- gateway validates on every API call
- Temporary delegation for vacation (role can be granted temporarily with expiry)

### 9.3 System Settings

- Company information (name Arabic/English, CR number, TRN, addresses, logo, digital stamp)
- Currency and locale settings
- Working days and hours (Sunday-Thursday default, configurable)
- Prayer time API configuration
- Ramadan mode toggle and adjusted hours
- WhatsApp Business API configuration
- Email settings (Resend)
- SMS settings (Twilio)
- Default payment terms for new customers
- Quote validity defaults per category
- Notification preferences (which events trigger which channels)

### 9.4 Margin Rules

**Configurable per material category:**
- Target margin %
- Floor margin %
- Absolute minimum margin %
- Approval thresholds (which level approves at which margin)
- Customer tier overrides (Tier A may have lower floor than Tier C)

### 9.5 Approval Thresholds

**Configurable rules for:**
- Quote margin approvals (by margin % and total value)
- Credit limit increase approvals (by % increase and absolute value)
- Purchase order approvals (by PO value)
- Return/credit note approvals (by value)
- Inventory adjustment approvals (by value)

Each rule: condition, required approver(s), escalation time, escalation target

### 9.6 Holiday Calendar

- Egyptian public holidays pre-loaded (14-15 per year)
- Islamic holidays flagged as variable (moon sighting dependent) with estimated dates + actual date confirmation field
- Working day calculations use this calendar for SLA timers, delivery scheduling, escalation
- Admin can add/remove/adjust dates

### 9.7 Audit Log

- Every significant action logged: who, what, when, old value, new value
- Searchable by user, action type, entity, date range
- Immutable (WORM pattern for SOX compliance)
- 7-year retention
- Export capability

---

## MODULE 10: REPORTS / ANALYTICS

**Primary users:** All roles (filtered by permission), Management, CEO
**Hotkey:** `R`

### 10.1 Role-Specific Dashboards

Each role sees different KPIs and reports when opening this module.

**Sales Dashboard:**
- Pipeline value, weighted forecast, target progress
- Quote-to-order conversion rate
- Average response time to RFQs
- Win rate (by count and value)
- Revenue MTD/QTD/YTD vs target
- Margin trend (line chart)
- Top 10 deals this period
- Rep leaderboard (manager only)

**Procurement Dashboard:**
- Pending inquiries, response rate, average response time
- PO status distribution
- Supplier performance rankings
- Price trend analysis by category
- Cost savings achieved

**Operations Dashboard:**
- Orders in progress by stage
- On-time delivery rate
- Delivery completion rate
- Average fulfillment cycle time
- Warehouse utilization

**Finance Dashboard:**
- Revenue MTD, AR outstanding, overdue AR, cash position
- AR aging breakdown
- AP aging breakdown
- Margin trend
- Payment method distribution
- 13-week cash forecast chart
- Cheque status summary

**Warehouse Dashboard:**
- Inventory accuracy, pick accuracy, on-time shipment
- Receiving cycle time
- Inventory turnover
- Capacity utilization by zone
- Slow-moving inventory value

**Dispatch Dashboard:**
- Deliveries today (completed/total)
- First-attempt success rate
- Average stops per driver
- Route efficiency
- Cairo night delivery count

**CS Dashboard:**
- Open tickets by priority
- SLA compliance rate
- Average resolution time
- NPS score trend
- Top issue categories

### 10.2 Report Builder

**Standard report library** with filters:
- Date range (MTD/QTD/YTD/custom)
- Department, team, individual
- Customer tier, customer name
- Material category
- Region/base

**Export:** `[CSV]` `[PDF]` `[Email]`
**Schedule:** Recurring daily/weekly/monthly email delivery

> **Phase 2 deferral:** A custom Report Builder with drag-and-drop field selection, custom aggregations, chart type selection (bar/line/pie), and saved report templates is deferred to Phase 2. Phase 1 provides the pre-built role-specific reports described in 10.1, all with: date range filtering (MTD/QTD/YTD/custom), department/team/individual filters, CSV + PDF export, and recurring email scheduling (daily/weekly/monthly). The filters and export options listed above ARE the Phase 1 report builder scope.

---

## MODULE 11: AI ASSISTANT

**Primary users:** All internal employees
**Hotkey:** `I`
**Also accessible from:** Ctrl+K command palette (type question), floating AI button within any module

### 11.1 AI Chat Interface

**Layout:** Chat window (glass, same pattern as all modules)
- Text input at bottom with `[Send]` button and `[Attach]` for documents
- Conversation thread above
- Suggested prompts for first-time users based on role
- Full conversation history (searchable)

### 11.2 Role-Aware Capabilities

The AI has the same permission system as the UI. It can only access data the user has access to.

**Sales users can ask:**
- "Show me all open quotes for Al-Nour Construction"
- "What's the status of Quote #4521?"
- "Draft a follow-up email to Ahmed about his pending quote"
- "Which customers haven't ordered in 30+ days?"
- "What margin did we give MetroBuild on their last steel order?"
- "Summarize today's stuck items"

**Procurement users can ask:**
- "Which supplier has the best pricing on rebar this month?"
- "What's Supplier A's on-time delivery rate?"
- "Create a price inquiry for 500 tons of cement"

**Operations users can ask:**
- "What orders are at risk of missing their delivery date?"
- "Show me all deliveries scheduled for tomorrow"

**Finance users can ask:**
- "What's our AR aging over 90 days?"
- "Which customers have bounced cheques?"
- "Generate a cash flow forecast for next 4 weeks"

**Warehouse users can ask:**
- "Where is Portland Cement Type I located?"
- "What's the cycle count accuracy this month?"

**Dispatch users can ask:**
- "Which drivers are available for tomorrow?"
- "Optimize routes for today's Cairo deliveries"

**Management can ask:**
- "How are we doing this month?" (narrative summary)
- "Compare this quarter to last quarter"
- "Which sales rep has the highest margin?"
- "What needs my approval?"

### 11.3 AI Features Beyond Chat

- **Morning briefing:** generated summary of yesterday's events + today's priorities, delivered in chat on first login
- **Anomaly detection:** AI flags unusual patterns (sudden margin drop, supplier quality decline, unusual order quantity)
- **Draft generation:** emails, follow-up messages, meeting notes
- **Document parsing:** upload a customer's PDF/Excel material list, AI extracts structured data into RFQ
- **Price prediction:** historical data analysis for expected supplier costs

### 11.4 AI Safety

- AI never constructs raw SQL (parameterized queries only)
- Read-only database connection
- Draft-review-confirm pattern for all mutations (AI suggests, user confirms)
- Capability tiers per role
- Full audit log of every AI query and response
- Prompt caching for repeated schemas (90% cost reduction)

### 11.5 AI Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `I` | Open AI module (from canvas) |
| `Ctrl+K` then type question | Quick AI query via command palette |
| `Enter` | Send message |
| `Escape` | Close AI window |

---

## CROSS-CUTTING CONCERNS

### Real-Time Updates

All modules receive real-time updates via Supabase Realtime:
- `postgres_changes`: order status updates, delivery status, quote notifications, payment confirmations, inventory changes
- `broadcast`: GPS pings (dispatch map), typing indicators (support chat)
- `presence`: online status (who's logged in, useful for dispatch and support)

Realtime data invalidates TanStack Query cache -- never writes directly to the store.

### Internal Communication (Object-Centric)

- Activity feed on every entity (orders, quotes, customers, deliveries, tickets)
- @mentions with role-aware routing (e.g., @procurement on a quote triggers notification to procurement team)
- Internal vs external comments (color-coded: blue=internal, gray=external/customer-visible)
- System events interleaved in the feed (status changes, auto-actions, escalations)

### Handoff Protocols

- Every entity state has exactly ONE owner (department/role)
- State transitions require explicit action (button click, not dropdown)
- Maximum dwell time per state with auto-escalation
- "Hot Potato" rule: unacknowledged within 30 min -> escalates to department manager
- Escalation chain: Quote unassigned >30min -> Sales Manager. Pricing pending >24h -> Procurement Manager. Delivery not scheduled <24h before promise -> Ops Manager. Invoice overdue >30d -> auto-reminder, >60d -> Credit Manager + hold.

### Daily Operations Meeting Support

System auto-generates 7 AM agenda from:
- Today's deliveries and status
- Stuck items (anything exceeding SLA)
- Credit holds blocking orders
- Pipeline highlights (large quotes pending, wins/losses)
- No slides, no prep -- the dashboard IS the meeting

### Permissions Matrix (Summary)

| Module | CEO | Admin | Sales Mgr | Sales Rep | Procurement | Ops Mgr | Warehouse Mgr | WH Worker | Finance | Dispatcher | CS | HR |
|--------|-----|-------|-----------|-----------|-------------|---------|---------------|-----------|---------|------------|----|----|
| Sales | View | Admin | Full | Own accounts | View pricing | View | -- | -- | View financials | -- | View | -- |
| Procurement | View | Admin | View | View status | Full | View | -- | -- | View costs | -- | -- | -- |
| Orders/Ops | View | Admin | View | View own | View | Full | View | View assigned | View | View | View | -- |
| Warehouse | View | Admin | -- | -- | View | Full | Full | Own tasks | View value | -- | -- | -- |
| Finance | View | Admin | View margins | View margins | View AP | View | -- | -- | Full | -- | View | -- |
| Dispatch | View | Admin | -- | -- | -- | Full | View | -- | -- | Full | -- | -- |
| CS/Support | View | Admin | View | View own | -- | View | -- | -- | View | -- | Full | -- |
| HR | View | Admin | View team | -- | -- | -- | -- | -- | View payroll | -- | -- | Full |
| Admin | Full | Full | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- |
| Reports | Full | Full | Sales reports | Own reports | Procurement | Ops reports | WH reports | -- | Finance | Dispatch | CS reports | HR reports |
| AI | Full | Full | Sales data | Own data | Procurement data | Ops data | WH data | Limited | Finance data | Dispatch data | CS data | HR data |

Unauthorized elements are hidden, not disabled. All frontend permission checks are UX-only -- the API gateway validates on every request.

### Egyptian Operational Calendar Integration

**Work week:** Sunday - Thursday. Weekend: Friday + Saturday.
**Prayer times:** 5 daily (Fajr, Dhuhr, Asr, Maghrib, Isha). 10-15 min buffer in delivery ETAs. Prayer-time API integration.
**Friday Jumu'ah:** Hard blackout 11:30 AM - 1:30 PM. No deliveries, no customer calls, no warehouse operations.
**Ramadan mode:** Working hours reduced to 6h/day. Adjusted SLAs. Shorter delivery windows. System toggle in Admin settings.
**Holidays:** 14-15 per year. Islamic holidays variable (moon sighting). Configurable in Admin.
**Khamsin (March-May):** Weather API integration. Block sheet material deliveries >30 km/h wind. Auto-pause outdoor warehouse operations in severe storms.
**Summer heat (June-Sept):** Mandatory driver breaks, no loading 12-3 PM, reduced shelf life tracking for cement/adhesives.
**Cairo truck ban:** Heavy trucks (5+ tons) banned 6AM-midnight. Dispatch auto-blocks. Customer-facing: "Night delivery: 12AM-6AM" for heavy materials in Greater Cairo.

### PWA Configuration

- PWA manifest present
- Install prompt: in Settings only. Never auto-prompt.
- Offline: subtle top banner "You're offline -- showing cached data." Mutations disabled. Reconnect: banner auto-dismisses, data refreshes.

---


> **Implementation:** TanStack Start SPA/PWA | Deploy: Cloudflare Workers | Auth: Supabase SSR (SSO with Internal)
> **Key packages:** react-aria-components, motion, zustand, @tanstack/ai-react, pdf-lib
> **Shared packages:** @hyperquote/ui, @hyperquote/auth, @hyperquote/i18n

## APP 4: CEO COMMAND CENTER (`ceo.hyperquote.net`)

### Architecture

- **Framework:** TanStack Start SPA/PWA
- **Deploy:** Cloudflare Workers
- **Auth:** Supabase `@supabase/ssr` with `.hyperquote.net` SSO cookie
- **State:** Zustand (UI) + TanStack Query (server) + TanStack Router search params (URL)
- **AI:** `@tanstack/ai-react` `useChat()` for streaming responses
- **Offline:** Service Worker for app shell + IndexedDB for structured data cache
- **i18n:** react-i18next, Arabic primary, English secondary
- **PWA install prompt:** In settings only. Never auto-prompt.

### UI Vision (Non-Negotiable)

- Wide empty space + centered search bar + lion watermark at barely-perceptible opacity (3-5%)
- **Nothing else.** No cards, no metrics, no sidebar, no navigation bar, no hamburger menu.
- **Zero accent colors.** No blue for interactive elements. The only non-gray colors are semantic status: success (green), warning (yellow), error (red), info (blue-gray). These are data, not design.
- Emphasis through typography weight and contrast only. Inter 600 vs Inter 400. Black vs muted gray. Geist Mono for numbers.
- Three colors: white (light mode bg), black (dark mode bg / text), gray spectrum for hierarchy.
- Glass panels for overlays (settings, compose, approval detail) per UI-VISION.md two-tier system: Window and Elevated.
- Motion: spring for entering (windows emerge), tween for exiting (windows dismiss). Zero decorative animation.
- Mobile-first. Phone is the primary device. Desktop and tablet are supported but secondary.

### Typography Rules (CEO Overrides — see DS.2 for shared base)

| Font | Usage |
|------|-------|
| Inter 600 | Section headers, greeting, entity names |
| Inter 500 | Category headers, action buttons (text-only), row primary text |
| Inter 400 | Body text, descriptions, AI response text, secondary info |
| Geist Mono 500 | All monetary values, percentages, counts, KPI numbers |
| Geist Mono 400 | Timestamps, dates, IDs, secondary numeric data |
| IBM Plex Sans Arabic | All Arabic text, matching weight mapping (100-700 only) |

Base font size: 14px. Arabic-Indic numerals in Arabic context. Currency: "EGP" prefix in English, "ج.م" suffix in Arabic. Thousands separator: comma in English, per locale in Arabic. All via `Intl.NumberFormat`.

---

### Screen 1: Login

**URL:** `ceo.hyperquote.net/login`

**Layout:**
- Pure white (light) or pure black (dark) background. No gradients, no blobs.
- Centered glass panel (Window tier), 360px max-width on mobile, 400px on desktop.
- HyperQuote wordmark at the top of the panel, muted opacity.

**Authentication flow (ordered by priority):**
1. **Biometric** (primary): Face ID / fingerprint via Web Authentication API (WebAuthn). One tap. If device supports it and user has enrolled, this is the default.
2. **PIN fallback**: 6-digit numeric PIN. Displayed as dots with a custom numeric keypad rendered in-app (large touch targets, 56dp buttons). Auto-submit on 6th digit.
3. **OTP fallback**: Phone number input (Egyptian +20 prefix pre-filled). OTP delivered via WhatsApp primary (99.5% delivery in Egypt), SMS fallback after 30s, voice call after 60s. OTP input: 6-digit field with auto-advance between digits.

**Inputs:**
- Phone number field: `react-aria-components` `TextField` with `type="tel"` and country code prefix. Validates Egyptian mobile format (+20 10x, +20 11x, +20 12x).
- PIN field: Custom 6-dot display, numeric keypad below. Each dot fills on input. Backspace clears last dot. No visible digits.
- OTP field: 6 separate single-digit inputs. Auto-focus advances to next. Paste support for full 6-digit code.

**Validation:**
- Phone number: required, valid Egyptian mobile format. Inline error below field in Inter 400, semantic error color.
- PIN: 6 digits required. After 3 failed attempts, lock to OTP flow for 15 minutes.
- OTP: 6 digits required. Expires after 5 minutes. "Resend" link appears after 30s countdown (Geist Mono for countdown timer).

**Session:**
- Supabase JWT with 12-hour expiry. Refresh token rotation. Session persists across app closures.
- Biometric re-authentication on every app open (configurable in settings: "always", "after 5 min", "after 1 hour", "never").

**Offline behavior:** Login requires network. If offline, show: "Connection required to sign in" in Inter 400, muted gray. Retry button.

**RTL/Arabic:** All labels, placeholders, and error messages through `react-i18next`. Logical CSS properties for padding/margin. Numeric keypad layout does not change in RTL (numbers are universal).

**Transitions:**
- On successful auth: login panel fades out (tween, 200ms). A subtle "Good morning, Karim" appears from center, holds for 1.5s, then fades. Home state renders.

---

### Screen 2: Home (Empty Space + Search Bar + Lion)

**URL:** `ceo.hyperquote.net/`

**Layout:**
- Full viewport. Pure white (light) or pure black (dark).
- Lion watermark: `LyonBlack.svg` (light mode) or `LyonWhite.svg` (dark mode), centered, 3-5% opacity. Never stretched, rotated, or modified.
- Greeting: centered, above the search bar. Inter 600, text-2xl (20px), black/white. "Good morning, Karim" / "Good afternoon, Karim" / "Good evening, Karim" based on system clock and user's first name from session. No exclamation marks. In Arabic: "صباح الخير، كريم".
- Search bar: centered vertically and horizontally. 90% viewport width on mobile, max-width 600px on desktop. Height 48px. Background: very subtle gray (gray-100 light / gray-900 dark). Rounded corners (24px radius). No border. Placeholder text: rotating hints in Inter 400, muted gray. Examples: "Search employees, customers, orders..." / "ابحث عن موظفين، عملاء، طلبات..." Rotation interval: 6 seconds, crossfade transition.
- Attention items (conditional): below the greeting, single line. Inter 400, text-base (14px). Format: "{count} items need attention" where count is in Geist Mono 500, semantic error color (red-600). The count is a tappable link. If zero attention items, this line does not render. No "all clear" message. Absence is the message.
- Daily digest indicator (conditional): below attention items (or below greeting if no attention items). "Tuesday digest ready" in Inter 400, muted gray, tappable. Only appears if a new digest is available and unread. Disappears after viewing.
- Weekly insight indicator (conditional): same pattern. "Weekly insight ready" in Inter 400, muted gray, tappable. Appears on the first workday after the insight is generated (Sunday in Egyptian calendar).

**Attention items source:**
- Materialized view `ceo_attention_items` refreshed every 5 minutes via pg_cron.
- Includes: bounced cheques (any amount), AR overdue > 90 days above configurable EGP threshold, credit limit breach requests pending CEO approval, margin alerts (deals below floor), delivery failures on orders > EGP 1M, supplier payment defaults.

**Data displayed:**
- Greeting: user first name from Supabase auth session.
- Attention count: integer from `ceo_attention_items` aggregate.
- Digest/insight availability: boolean from `ceo_digests` table.

**Interactions:**
- Tap search bar or press `/` (desktop): search bar gains focus, keyboard appears.
- Tap attention count: triggers search-up animation, attention items list renders below search bar (see Screen 3).
- Tap digest/insight: triggers search-up animation, digest/insight content renders below.

**Offline behavior:**
- App shell loads from service worker cache.
- Greeting renders (name cached locally).
- Attention count shows last-known value with "Last synced: 8:42 AM" in Geist Mono 400, text-xs, muted gray.
- Search bar shows "Search unavailable offline" as placeholder.
- Top banner: thin strip (28px), muted gray bg, Inter 400 text-xs: "You're offline -- showing cached data". Auto-dismisses on reconnect.

**RTL/Arabic:** Greeting, placeholder, attention text all from i18n. Layout mirrors via logical properties. Lion watermark is symmetric, no RTL adjustment needed.

---

### Screen 3: Search Results

**URL:** `ceo.hyperquote.net/?q={query}` (query in TanStack Router search params, Zod-validated)

**Trigger:** User types any character in the search bar.

**Animation:** Search bar slides upward to the top of the screen (spring, 300ms). Lion watermark fades out. Results stream below the search bar.

**Search implementation:**
- Debounce: 150ms after last keystroke.
- Target: <100ms query response via Hyperdrive-cached Supabase.
- Backend: `search_index` table with `pg_trgm` fuzzy matching + `tsvector` full-text ranking.
- Results grouped by entity type via `ROW_NUMBER() PARTITION BY entity_type`.

**Layout:**
- Search bar: pinned to top, full width. Input field with clear button (X) on the right. On mobile, native keyboard is open.
- Results: scrollable area below search bar. Grouped by category.

**Category groups (in display order):**
1. **Employees** -- name (Inter 500), role + department (Inter 400, muted gray)
2. **Customers** -- company name (Inter 500), account status indicator if relevant
3. **Orders** -- order ID in Geist Mono 400 + customer name (Inter 500) + amount in Geist Mono 500
4. **Invoices** -- invoice ID in Geist Mono 400 + customer name + amount + status badge
5. **Suppliers** -- company name (Inter 500), category (Inter 400, muted gray)
6. **Deliveries** -- delivery ID + customer name + status badge (color-coded: semantic green/yellow/red)
7. **Products** -- product name (Inter 500), category (Inter 400, muted gray)

**Category header:** Inter 500, text-sm (12px), uppercase, tracking-wide, muted gray. Format: "EMPLOYEES (4)" with count in parentheses.

**Result row:**
- Minimum height: 44px (Apple HIG touch target).
- Comfortable padding: 12px vertical, 16px horizontal.
- No avatars, no icons, no decorative elements.
- If more than 3 results in a category: "View all" text link in Inter 400, muted gray, after the third row.
- **Results per group:** Top 3 shown initially per category. "View all N results" link below each group (Inter 400, muted gray) expands inline to show the full list for that category.
- **Group ordering:** Categories are ordered by relevance score (best overall match first), not by the fixed display order listed above. If "Orders" has the highest-scoring match, Orders appears first regardless of position in the default category list.
- **Exact match shortcut:** If a query matches exactly one entity (e.g., typing a full order number like "ORD-2026-01204" or a full invoice number), skip the results page entirely — navigate directly to the detail view (Screen 4). Detected via `exact_match` flag from the search API when result count = 1 and match score > 0.95.
- **Keyboard navigation:** Arrow keys (Up/Down) move between individual result rows across all groups. Tab jumps between category group headers. Enter on a result row opens the detail view. Enter on a group header expands/collapses that group.

**Empty state:** If no results match:
```
No results for "{query}"

Try searching by:
  - Company trade name or legal name
  - Customer account number
  - Employee name or department
```
Inter 400, muted gray. No illustrations, no sad face, no lion. Search bar remains active.

**Interactions:**
- Tap any result row: crossfade to detail view (Screen 4).
- Tap category header "View all": navigate to a filtered list view for that entity type.
- Press Enter/Send: transition to AI chat (Screen 5) with current query as initial message.
- Press Escape or tap X: clear search, animate back to home state (search bar slides down, lion fades in).
- Swipe right (iOS): same as Escape.

**Validation:** Query string is Zod-validated: `z.string().min(1).max(200)`. Empty queries are rejected (search bar does not fire).

**Offline behavior:** "Search unavailable offline" message. Previously viewed results may be available from TanStack Query cache (`gcTime` = 10 minutes).

**RTL/Arabic:** Result rows mirror. Category headers align to start. Search input text direction follows language. Arabic search works with `pg_trgm` (configured for Arabic tokenization).

---

### Screen 4: Individual Result Detail

**URL:** `ceo.hyperquote.net/{entity_type}/{entity_id}` (e.g., `/employees/uuid`, `/customers/uuid`, `/orders/ORD-1204`)

**Animation:** Results list fades out. Detail view slides in with subtle spring. Back arrow appears in top-left (top-right in RTL).

**Layout pattern (shared across all entity types):**
- Back arrow (or swipe-right gesture on mobile) returns to search results. State preserved.
- Entity name: Inter 600, text-xl (18px), at top.
- Subtitle: Inter 400, text-base, muted gray. Entity-specific (role for employee, legal name for customer, etc.).
- Data sections: separated by 24px vertical spacing. Section label in Inter 500, text-sm, uppercase, tracking-wide, muted gray. Data rows below in Inter 400 with values in Geist Mono where numeric.
- Action buttons: at the bottom of the view. Text-only buttons in Inter 500, no background, generous spacing (minimum 24px between buttons). Semantic actions only.
- Deep link: at the very bottom, "View full details in [Module] -->" in Inter 400, muted gray. Opens `app.hyperquote.net/{module}/{entity}/{id}` in browser. SSO cookie ensures authentication.

#### Employee Detail

**Data displayed:**
```
Ahmed Fawzi                                          [Back]
Sales Rep -- Sales Department
Joined: Sep 12, 2024

Contact
  Phone: +20 100 XXX XXXX                            [Call]
  Email: ahmed.fawzi@hyperquote.net                   [Email]

Quick stats
  Active quotes: 8
  Pipeline value: EGP 12,400,000
  Win rate (90d): 34%
  Avg margin: 14.8%

Recent activity
  Mar 28 -- Sent quote QT-1210 to Nile Developers (EGP 2.1M)
  Mar 27 -- Closed order ORD-1201 from Arab Contractors (EGP 890K)
  Mar 26 -- Updated quote QT-1204 margin to 7.2%

[View full profile in HR -->]
```

- [Call] triggers native dialer via `tel:` link.
- [Email] triggers native email client via `mailto:` link.
- All monetary values in Geist Mono 500.
- Recent activity: last 5 entries from `entity_timeline` audit log, filtered by employee. Dates in Geist Mono 400.

#### Customer Detail

**Data displayed:**
```
Al-Masriya Construction Co.                          [Back]
Customer since Jun 2023

Contact
  Primary: Eng. Omar Hassan                           [Call]
  Phone: +20 112 XXX XXXX
  Email: omar@almasriya.com.eg                        [Email]
  Account manager: Ahmed Fawzi

Financial snapshot
  Credit limit: EGP 1,200,000
  Credit used: EGP 980,000 (82%)                     [Warning]
  Total AR: EGP 1,230,000
  Overdue: EGP 250,000 (14 days)                     [Error]

Order history (last 6 months)
  Orders: 12
  Total revenue: EGP 8,400,000
  Avg order value: EGP 700,000
  Avg margin: 14.2%

Recent orders
  ORD-1198 -- EGP 890,000 -- Delivered
  ORD-1187 -- EGP 1,200,000 -- Delivered
  ORD-1174 -- EGP 650,000 -- Invoiced

Alerts
  Bounced cheque: EGP 250,000 (Mar 28)               [Error]

[Route to Finance]    [Route to Sales]    [Call Account Manager]

[View full profile in CRM -->]
```

- Credit utilization percentage shown as progress indicator (gray bar, no color unless > 80% = warning, > 95% = error).
- Bounced cheque alert uses semantic error color for badge and amount.

#### Order Detail

**Data displayed:**
```
Order ORD-1204                                       [Back]
Al-Masriya Construction Co.
Created: Mar 15, 2026 | Status: Delivered

Items
  50x Cement bags (50kg) -- Portland Type I
  20x Rebar bundles (12mm, 12m)
  40x Plywood sheets (18mm)

Financial
  Order value: EGP 3,200,000
  Margin: 14.8%
  Invoice: INV-3892 -- EGP 3,200,000
  Payment status: Partial -- EGP 1,800,000 received   [Warning]
  Outstanding: EGP 1,400,000 (due Apr 14)

Delivery
  Delivered: Mar 22, 2026
  Driver: Mohammed Ali
  POD: Signed by Eng. Hassan (Foreman)
  Delivery note: DN-3892                              [View PDF]

Timeline
  Mar 15 -- Order created by Ahmed Fawzi
  Mar 16 -- Supplier POs generated (3 suppliers)
  Mar 18 -- All materials confirmed by suppliers
  Mar 20 -- Loaded at warehouse
  Mar 22 -- Delivered, POD captured

[Route to Finance]    [Route to Operations]

[View full details in Orders -->]
```

- Status badges use semantic colors: Delivered = green, In Transit = blue-gray, Pending = gray, Failed = red, Partial = yellow.
- [View PDF] opens the delivery note PDF in the browser's native PDF viewer.

#### Invoice Detail

**Data displayed:**
```
Invoice INV-3892                                     [Back]
Al-Masriya Construction Co.
Issued: Mar 22, 2026 | Due: Apr 21, 2026

Amount: EGP 3,200,000
VAT (14%): EGP 448,000
Total: EGP 3,648,000

Payment status
  Received: EGP 1,800,000 (Mar 25, wire transfer)
  Outstanding: EGP 1,848,000
  Days until due: 23

ETA submission: Submitted Mar 22, reference: ETA-892741

[View invoice PDF]    [Route to Finance]

[View full details in Finance -->]
```

#### Supplier Detail

**Data displayed:**
```
El-Nasr Steel                                        [Back]
Supplier since: Aug 2024

Contact
  Primary: Eng. Tarek Mahmoud                         [Call]
  Category: Steel & Rebar

Performance (last 12 months)
  Total PO value: EGP 22,000,000
  On-time delivery: 91%
  Quality issues: 2 (resolved)
  Active POs: 3

Terms
  Payment: Net 60
  Early payment discount: 2% / 15 days
  Minimum order: EGP 500,000

[Route to Procurement]

[View full details in Procurement -->]
```

#### Delivery Detail

**Data displayed:**
```
Delivery DEL-4521                                    [Back]
Order: ORD-1204 | Customer: Al-Masriya Construction

Status: Delivered                                    [Success]
Driver: Mohammed Ali
Vehicle: Truck #HQ-017 (Flatbed + Moffett)

Timeline
  Departed warehouse: 6:30 AM
  Arrived at site: 7:38 AM
  Unloading complete: 8:05 AM
  POD captured: 8:10 AM

Items delivered
  48/50 Cement bags (SHORT 2 -- damaged at warehouse)
  20/20 Rebar bundles

POD
  Signed by: Eng. Hassan Mohamed Ali (Foreman)
  Photos: 3                                           [View]
  Condition: Good (2 bags short noted)

[View delivery note PDF]    [Route to Operations]

[View full details in Logistics -->]
```

#### Product Detail

**Data displayed:**
```
Portland Cement Type I (50kg bag)                    [Back]
Category: Cement & Concrete
SKU: CEM-PORT-50

Pricing (internal -- not shown to customers)
  Last supplier cost: EGP 85/bag
  Avg selling price: EGP 102/bag
  Avg margin: 20%

Movement (last 30 days)
  Units sold: 2,400
  Revenue: EGP 244,800
  Top customers: Al-Masriya (800), Nile Developers (600)

Availability
  Suppliers: El-Nasr (in stock), Alexandria Cement (in stock)
  Lead time: 2-3 days

[View full details in Products -->]
```

**Offline behavior for all detail views:** If entity data is in TanStack Query cache, display it with "Last synced" timestamp. If not cached, show: "Detail unavailable offline. Return to search." No skeleton loaders for uncached detail views -- just the message.

---

### Screen 5: AI Chat

**URL:** `ceo.hyperquote.net/ai` (or triggered from search by pressing Enter)

**Trigger:** From search results, press Enter/Send. From home screen, type a query and press Enter.

**Animation:** Search results fade out. Search bar slides to the top. AI chat interface rises from the bottom (tween, 300ms). Chat area occupies the space between search bar and input bar.

**Layout:**
- Search bar at top (now serves as session indicator -- shows the initial query, tappable to return to search mode).
- Chat messages area: scrollable, full width. Messages alternate between user (right-aligned in LTR, left in RTL) and AI (left-aligned in LTR, right in RTL).
- User messages: Inter 400, displayed in a subtle gray rounded container (gray-100 light / gray-800 dark).
- AI messages: Inter 400, no container (clean text on background). Structured data (tables, numbers) in Geist Mono.
- Input bar at bottom: same styling as search bar. Placeholder: "Ask anything..." / "اسأل أي شيء...". Send button (arrow icon) appears when text is entered.
- Thinking indicator: three subtle dots pulsing in a horizontal line. Inter 400, muted gray. Replaces itself with the AI response.

**Dual AI routing (invisible to user):**

1. **Analytics AI (Text-to-Data):**
   - GLM-4.7-Flash (Tier 1, free) classifies intent.
   - If `analytics_query`: extracts parameters (entity, metric, time period, filters).
   - Pre-computed metrics from `ceo_metrics` materialized view fed to Groq (Tier 2) for natural language response.
   - Falls back to text-to-SQL against read replica for unusual questions.
   - Examples: "revenue", "Q1 vs last year", "which customers overdue more than 60 days?", "top 5 products by margin"

2. **RAG AI (Document Intelligence):**
   - GLM classifies as `document_search`.
   - Query embedded via `text-embedding-3-small` (1536 dimensions).
   - Searched against `document_embeddings` in pgvector (hybrid: vector + BM25 keyword).
   - Top 5 chunks by cosine similarity (threshold 0.7).
   - Claude Sonnet (Tier 4) synthesizes answer with citations.
   - Examples: "what are our payment terms with El-Nasr?", "what does the return policy say?", "show me the safety SOP"

**Response formatting:**
- Plain text: Inter 400.
- Data tables: Geist Mono 500 for values, Inter 400 for labels. Aligned columns. No table borders -- spacing and alignment create structure.
- Charts: simple bar charts only. Black/dark-gray bars for one series, lighter gray for comparison series. Zero accent colors. Bars labeled with Geist Mono values. Charts rendered client-side as SVG.
- Citations: "Source: {document name} ({date}), p.{pages}" in Inter 400, text-xs, muted gray. "[View source document -->]" link opens PDF.
- Confidence disclaimer: if RAG similarity < 0.7-0.8: "This information is based on available documents but may not be fully current. Verify with [department] for the latest terms."

**Source line on every AI response:**
```
Source: Analytics (pre-computed Mar 29, 06:00 AM)    [Report issue]
```
or:
```
Source: El-Nasr Steel Agreement (Aug 2025), p.4-5    [Report issue]
```
Inter 400, text-xs, muted gray. [Report issue] opens a minimal form (data issue type + optional details, routed to system administrator).

**Actionable responses:**
- When AI suggests actions, it presents them as tappable links or buttons.
- "Route to Finance" → opens compose overlay (Elevated glass panel).
- "View revenue breakdown -->" → navigates to a detail view within the CEO app.
- AI reformulates casual instructions into professional internal messages and presents for confirmation before sending.
- AI never executes operational changes directly -- it routes instructions to responsible people.

**Tappable data in responses:**
- Customer names in AI responses are tappable → navigate to customer detail (Screen 4).
- Order IDs are tappable → navigate to order detail.
- Employee names are tappable → navigate to employee detail.

**Export controls on AI responses:**
- Subtle footer below each AI response: `[Export as PDF]    [Copy to clipboard]`
- PDF: HyperQuote letterhead, clean data (no chat UI), footer with generation date. Generated via pdf-lib in Cloudflare Worker.
- Copy: formatted text preserving Geist Mono number alignment.

**Conversation persistence:**
- Conversations stored in `ai_conversations` table (Supabase) per session.
- On app reopen, previous conversation is available (loaded from cache first, then server).
- No conversation list/sidebar (unlike ChatGPT). Each session is a single thread. Starting a new query from home starts a new conversation.

**Hotkeys (desktop):**
- `/` focuses search bar (exits AI chat if active).
- `Esc` exits AI chat, returns to search results or home.
- `Enter` in search bar with query text sends to AI.

**Offline behavior:**
- Previous conversation cached locally and viewable.
- New AI queries show: "AI requires a connection. Your previous conversation is available above."
- Input bar disabled.

**RTL/Arabic:**
- User messages align to end (left in RTL). AI messages align to start (right in RTL).
- AI responds in the language the user writes in. Arabic queries get Arabic responses. English queries get English responses.
- Arabic search works with pg_trgm (Arabic character support configured).

---

### Screen 6: Attention Items List

**URL:** `ceo.hyperquote.net/?view=attention`

**Trigger:** Tap the attention count on home screen.

**Animation:** Search bar slides up. Attention items list renders below, each in a glass-tinted row (Window tier, subtle).

**Layout:**
- Each item is a row with comfortable height (minimum 56px).
- Left: semantic status badge. Error = red text on red-50 bg. Warning = yellow-600 on yellow-50 bg.
- Content: entity name in Inter 500 + short description in Inter 400. Monetary values in Geist Mono 500.
- Right: timestamp in Geist Mono 400, text-xs, muted gray.
- No icons, no avatars, no decorative elements.

**Example rows:**
```
[Error]    Customer Y -- Bounced cheque -- EGP 250,000
           Today at 6:42 AM

[Warning]  Delta Builders -- AR overdue 94 days -- EGP 1,800,000
           Since Dec 25, 2025

[Warning]  Quote QT-1204 -- Margin 7.2% (floor: 10%)
           Approved by Sales Director yesterday
```

**Interactions:**
- Tap any row → crossfade to the relevant entity detail view (Screen 4) with context-specific data.
- Swipe right / back arrow → return to home state.

**Offline behavior:** Show cached attention items with "Last synced" timestamp.

---

### Screen 7: Daily Digest

**URL:** `ceo.hyperquote.net/?view=digest&date=2026-03-30`

**Trigger:** Tap "Tuesday digest ready" on home screen.

**Layout:**
- Search bar at top. Scrollable content below.
- Date header: Inter 600, text-lg, uppercase. "TUESDAY, MARCH 30, 2026".
- Sections: Revenue, Pipeline, Cash, AR aging, Delivery performance, Supplier updates, HR.
- Section headers: Inter 600, text-base.
- Data: Inter 400 for labels, Geist Mono 500 for values.
- Comparison indicators: "+8% vs Mon avg" in Geist Mono 400. Positive = no color (just the + sign). Negative = semantic error color.
- Warning badges: "[Warning]" next to concerning data (e.g., 90+ days AR).

**Data source:** `ceo_digests` table, generated daily at 6:00 AM by pg_cron from materialized views.

**Read-only.** No interactions except tapping back to home. If a data point concerns the user, they return to home and use search or AI to investigate.

**Optional email delivery:** Same content as plain-text email (no HTML marketing templates). Configured in settings.

**Offline behavior:** Cached in IndexedDB. Available offline if previously viewed.

---

### Screen 8: Weekly Insight

**URL:** `ceo.hyperquote.net/?view=insight&week=2026-W13`

**Trigger:** Tap "Weekly insight ready" on home screen.

**Layout:** Similar to digest but fundamentally different in content. The digest is data. The insight is analysis.

- Generated by Claude (Tier 4) using full week's pre-computed data + trend comparisons + business context from `business_data_embeddings`.
- Performance summary section with targets: values in Geist Mono 500, target comparisons in Geist Mono 400.
- Key observations: numbered list (1-4 typically). Inter 400 body text. Written in natural language, not just data points. Each observation identifies a trend, explains the cause, and suggests implications.
- Recommended actions: bulleted list at bottom. Each action has a subtle [Route] text button that opens the compose overlay to send the instruction to the relevant person.

**Scheduling:**
- Generated Sunday at 8:00 PM (Egyptian calendar, end of work week is Thursday, insight delivered before new week starts Sunday).
- Also delivered via email if configured.

**Offline behavior:** Cached locally once viewed.

---

### Screen 9: Push Alert Detail

**URL:** `ceo.hyperquote.net/alerts/{alert_id}` (deep-linked from push notification)

**Trigger:** CEO taps a push notification on phone lock screen.

**Push notification tiers:**

| Tier | Delivery | Criteria |
|------|----------|----------|
| Immediate | Push notification | Bounced cheques (any), AR > 90 days crossing EGP threshold, credit limit breach, delivery failure on order > EGP 1M, margin below emergency floor |
| Daily digest | In-app + optional email, 7:00 AM | New orders, revenue summary, pipeline changes, supplier updates, HR flags |
| Weekly insight | In-app + email, Sunday 8:00 PM | Trend analysis, week-over-week comparisons, strategic recommendations |

**Push notification format (native OS):**
```
HyperQuote
Customer Y's cheque bounced -- EGP 250,000
Cheque #4478201, CIB. Invoice INV-3892 (EGP 420,000, 14 days overdue).
```

**Alert detail layout:** Identical to the relevant entity detail view (Screen 4) but accessed directly via deep link. The notification payload contains `entity_type` and `entity_id` for direct navigation.

**Push configuration:**
- Quiet hours: 11:00 PM - 6:00 AM by default (configurable in settings).
- Immediate-tier alerts override quiet hours.
- Configurable per-event: CEO can move events between tiers in settings.

**Offline behavior:** If tapping a notification while offline, the app opens to the home state with an offline banner. The alert detail loads when connectivity returns.

---

### Screen 10: Settings

**URL:** `ceo.hyperquote.net/settings`

**Access:** Type "settings" in search bar and tap the result. Or ask AI "open settings". No settings icon visible on home screen (maintaining the empty space principle). The search result for "settings" appears in a special "System" category.

**Layout:** Glass panel (Window tier) slides in from the right (LTR) or left (RTL). Full-height, 85% viewport width on mobile, max-width 480px on desktop.

**Sections:**

**Notifications**
- Push notifications: on/off toggle (React Aria `Switch`).
- Quiet hours: start time + end time (React Aria `TimeField`).
- Override quiet hours for immediate alerts: on/off toggle.
- Per-event configuration: list of event types, each with a dropdown: Immediate / Daily digest / Weekly insight / Disabled.
- EGP thresholds: numeric inputs for AR overdue threshold, delivery failure order value threshold, margin floor.

**Language**
- Language: Arabic / English (React Aria `RadioGroup`). Changes `react-i18next` language and `dir` attribute.
- Date format: Gregorian (default) / Gregorian + Hijri display.
- Number format: follows language selection automatically.

**Appearance**
- Theme: Light / Dark / System (React Aria `RadioGroup`).
- Biometric lock: Always / After 5 min / After 1 hour / Never (React Aria `Select`).

**Alert Thresholds**
- AR overdue alert: EGP amount (React Aria `NumberField`).
- Delivery failure order value: EGP amount.
- Margin floor: percentage (React Aria `NumberField` with `formatOptions={{ style: 'percent' }}`).

**Board Reports**
- Recurring report: on/off toggle.
- Frequency: Weekly / Monthly (React Aria `Select`).
- Contents: checkboxes for report sections (revenue, AR aging, margin trends, top customers, pipeline, delivery performance).
- Format: PDF (only option currently).
- Email recipients: text input for email addresses, comma-separated.
- Schedule: day of week/month + time (React Aria `Select` + `TimeField`).

**Account**
- MFA: Enable/disable TOTP. Enroll WebAuthn credential.
- Active sessions: list of current sessions with "Sign out all other sessions" button.
- PWA: "Install to home screen" button (only if not already installed).

**Offline behavior:** Settings are cached locally. Changes made offline are queued and applied on reconnect.

**Validation:** All numeric inputs validated with Zod schemas. Inline field-level errors per UI-VISION.md (never toasts for form validation).

---

### Screen 11: Approval Flow

**URL:** `ceo.hyperquote.net/approvals/{approval_id}` (deep-linked from push notification or AI response)

**Access:** Push notification for approval request. Or ask AI "what needs my approval?" and tap the result. Or shown inline in attention items if an approval is pending. No separate approval queue screen.

**Layout:**
```
Approval Required                                    [Back]

Credit Limit Increase
Customer: Delta Builders
Current limit: EGP 1,200,000
Requested limit: EGP 2,000,000
Increase: +66.7%

Requested by: Mona Ibrahim (AR Manager)
Reason: "Customer has a new EGP 8M project starting in April.
Current limit insufficient to cover expected order volume."

Supporting data
  Customer since: Jun 2023
  Lifetime revenue: EGP 18,400,000
  Current AR: EGP 980,000 (82% of limit)
  Payment history: Avg 42 days to pay
  Bounced cheques (12 months): 1 (EGP 250,000, Mar 28)
  Credit score: B+ (internal rating)

Warning: This customer has a bounced cheque from 2 days ago.

[Approve]    [Reject]    [Request more info]
```

**Supported approval types:**
- Credit limit increases/decreases
- Large discounts (below margin floor)
- Write-off authorization (above configurable threshold)
- New supplier onboarding (above spend threshold)
- Expense approvals (above configurable threshold)

**Approval is a genuine write operation.** The CEO app has permission via `ceo_approvals` table with RLS policies for the CEO role. Approval status update triggers a database function that executes the underlying change (e.g., updating `customers.credit_limit`).

**Rejection flow:**
- Tap "Reject" → reason text area appears (Elevated glass overlay).
- AI pre-fills a suggested reason based on context (e.g., "Cannot approve increase while bounced cheque remains unresolved"). CEO can edit.
- Tap "Confirm rejection" → rejection notification sent to requester with reason attached.

**"Request more info" flow:**
- Text area for question to the requester.
- Approval status changes to "Needs info". Requester receives notification.
- When requester responds, CEO receives updated approval notification.

**Warning indicators:** If the supporting data contains conflicting signals (e.g., bounced cheque + credit increase request), a warning line appears in semantic error color.

**Offline behavior:** Approve/reject buttons are **hidden** (not grayed out, per UI-VISION.md: unauthorized/unavailable elements are hidden, not disabled). If CEO navigates to an approval while offline, the detail data shows from cache but no action buttons are present.

---

### Screen 12: Compose / Route Overlay

**URL:** No URL change. Elevated glass overlay.

**Trigger:** Tap "Route to Finance" / "Route to Sales" / "Route to Procurement" on any detail view. Or from AI chat when AI offers to route a message.

**Layout:** Elevated glass panel (stronger glass effect, over current view).
```
Route to: [Department dropdown]
Recipient: [auto-filled based on department + entity context]

Message:
[Text area with placeholder: "Add context..."]

Priority: [Normal] [Urgent]

[Cancel]                              [Send]
```

**Fields:**
- Department: React Aria `Select`. Options: Finance, Sales, Procurement, Operations, HR, Logistics.
- Recipient: auto-filled based on department routing rules (e.g., Finance AR issue → AR Manager). Editable via React Aria `ComboBox` searching internal employees.
- Message: React Aria `TextArea`. Max 1000 characters.
- Priority: React Aria `RadioGroup`. Normal / Urgent.

**On send:**
- Creates a notification in the internal app (`app.hyperquote.net`) for the recipient.
- Full context of the source entity is attached (e.g., bounced cheque details, customer data).
- Toast confirmation: "Routed to {name}." Auto-dismisses after 3 seconds.

**Offline behavior:** Message is queued locally. Indicator: "Message queued -- will send when online." On reconnect, sends and confirms: "Queued message sent to {name}."

---

### Screen 13: Board Report Export

**Access:** Via AI chat ("export Q1 revenue as PDF") or via the [Export as PDF] button on any AI response. Recurring reports configured in Settings (Screen 10).

**On-demand export:**
- AI response or detail view shows [Export as PDF] button.
- PDF generated via pdf-lib in Cloudflare Worker edge function.
- Content: HyperQuote letterhead, data tables, charts (rendered as embedded images), footer with generation date.
- No AI branding or chat UI in the export. Clean data only.
- Bilingual: Arabic for Egyptian financial statements, English for international boards. Language matches current app language.
- Shared via native iOS/Android share sheet (WhatsApp, email, AirDrop, etc.).

**Recurring reports:**
- Configured in Settings.
- pg_cron triggers Cloudflare Worker.
- Worker compiles data from materialized views, generates PDF, emails via Resend.
- Report content sections are configurable (revenue, AR, margins, customers, pipeline, delivery).

---

### Screen 14: Deep Link Behavior

When the CEO app contains a "View full details in [Module] -->" link:

- **Link target:** `app.hyperquote.net/{module}/{entity}/{id}` (e.g., `app.hyperquote.net/hr/employees/uuid`).
- **SSO:** Shared `.hyperquote.net` cookie via `@supabase/ssr`. CEO is already authenticated on the internal app.
- **PWA behavior:** If CEO PWA is installed as standalone, the link opens in the system browser (not inside the PWA). CEO uses browser back or switches back to the PWA. PWA state is preserved (service worker + TanStack Router state).
- **Non-PWA behavior:** Link opens in same or new tab (target `_blank`). Back button returns to CEO app.
- **Permission check:** If the CEO lacks access to a specific module in the internal app, the internal app redirects to its permission-denied handler. The CEO app does not pre-check permissions.

---

### Screen 15: Offline Mode

**Detection:** Service worker monitors `navigator.onLine` and fetch failures.

**Offline banner:** Thin strip at top (28px), muted gray bg, Inter 400 text-xs: "You're offline -- showing cached data". Does not obstruct the interface.

**What works offline:**
- App shell (cached by service worker).
- Home screen (greeting, last-known attention count with "Last synced" timestamp in Geist Mono 400 text-xs).
- Most recent daily digest (cached in IndexedDB).
- Most recent AI conversation (cached locally).
- Previously viewed search results (TanStack Query cache, `gcTime` = 10 minutes).
- Previously viewed entity detail views (TanStack Query cache).

**Offline cache scope (detailed):**

| Data | Cached? | Freshness |
|------|---------|-----------|
| Daily digest | Yes | Last generated (from `ceo_digests` table) |
| Weekly insight | Yes | Last generated |
| Attention items | Yes | Last refresh (up to 30 min stale) |
| Recently viewed entities (last 20) | Yes | Snapshot at time of view |
| Recent search results (last 5 searches) | Yes | Snapshot at search time |
| AI chat | NO — requires API | Show "AI unavailable offline" in chat area |
| Approvals | Yes (read-only) | Cannot approve/reject offline — buttons hidden |
| Settings | Yes | Local copy |

- Offline data shown with "Last updated X minutes ago" timestamp (Geist Mono 400 text-xs, muted gray) on each section.
- Stale data (> 1 hour since last sync): amber warning badge (Lucide `AlertTriangle` 14px + "Data may be outdated" text, `var(--color-warning)`).
- Very stale data (> 4 hours): red warning. "Connect to refresh."
- Settings (cached locally).

**What does not work offline:**
- New searches: "Search unavailable offline" placeholder.
- New AI queries: "AI requires a connection. Your previous conversation is available above."
- Approvals: approve/reject buttons are hidden (not disabled).
- Mutations disabled globally except route messages which are queued.

**Reconnection:**
- Banner auto-dismisses.
- Data refreshes silently in background.
- Queued route messages send with toast confirmation.

**"Last synced" indicator:** Geist Mono 400, text-xs, muted gray. Shown on home screen and on each data section when offline. Yellow at 15 min stale, red at 30 min stale.


> **Implementation:** Vite + React SPA (NOT TanStack Start) | Native: Capacitor 8 | Deploy: App Store + Play Store + PWA fallback
> **Key packages:** react-aria-components, motion, zustand, powersync, @transistorsoft/capacitor-background-geolocation, @capacitor-mlkit/barcode-scanning, @capgo/capacitor-native-biometric, maplibre-gl, react-map-gl
> **Shared packages:** @hyperquote/ui, @hyperquote/auth, @hyperquote/i18n

## APP 5: DRIVER APP (`driver.hyperquote.net`)

### Architecture

- **Framework:** Vite + React SPA (NOT TanStack Start -- server functions do not work in Capacitor WebViews)
- **Native wrapper:** Capacitor 8
- **Deploy:** App Store (iOS) + Play Store (Android). Web fallback at `driver.hyperquote.net` as PWA for external/on-demand drivers who do not install native.
- **Offline sync:** PowerSync (Capacitor SDK) + Supabase. Local SQLite for instant reads/writes. Upload queue with retry for POD, GPS, photos.
- **GPS:** `@transistorsoft/capacitor-background-geolocation` v9.0.2. Adaptive: 5s during active delivery, 15s en route, 30s idle. Motion-activated (accelerometer-based, only tracks when moving). $399 starter license.
- **Camera:** `@capacitor-mlkit/barcode-scanning` for barcode/QR. Capacitor Camera plugin for photos.
- **Auth:** Supabase auth with biometric via `@capgo/capacitor-native-biometric`. Session persists 12 hours.
- **Maps:** MapLibre GL + react-map-gl + PMTiles for offline tiles. Cairo metro area: ~200-400MB vector tiles pre-cached.
- **Navigation:** External launch to Sygic or HERE for truck-safe routing. NOT Google Maps (lacks truck profiles).
- **i18n:** react-i18next. Arabic primary (RTL). English secondary.
- **State:** Zustand (UI) + PowerSync (data) + TanStack Query (when online for non-critical data).

### UI Vision (Non-Negotiable)

- **Ultra-simple.** Uber driver simplicity. Zero cognitive load.
- **Big cards.** One delivery at a time. No multi-tasking.
- **Giant buttons:** 56-64dp minimum touch targets. Primary actions in bottom 40% of screen.
- **Swipe to complete:** Swipe-to-confirm gesture for delivery completion (full screen width, prevents accidental taps).
- **Glove-friendly.** Large touch targets, no precision taps.
- **One-handed operation.** All critical actions reachable with one thumb.
- **Auto dark mode:** Dark mode activates automatically during night shifts (configurable in settings, default: sunset-to-sunrise or 6PM-6AM). Manual toggle also available.
- **Three colors:** White (light bg), Black (dark bg / text), Blue (brand accent for interactive elements -- driver app uses blue unlike CEO app).
- **Semantic status:** Green (delivered/ok), Yellow (warning/pending), Red (failed/error), Blue-gray (in transit/info).

### Typography Rules (Driver Overrides — see DS.2 for shared base, DS.16 for touch targets)

| Font | Usage |
|------|-------|
| Inter 600 | Screen titles, customer names, primary data |
| Inter 500 | Button labels, section headers, secondary data |
| Inter 400 | Body text, instructions, descriptions |
| Geist Mono 500 | Quantities, weights, distances, times, IDs |
| Geist Mono 400 | Timestamps, secondary numeric data |
| IBM Plex Sans Arabic | All Arabic text |

Base: 16px (larger than other apps for outdoor readability). Primary text: 18-20sp minimum. Quantity input: 24sp bold. Confirmed data: 32sp bold. All text at 7:1 contrast (WCAG AAA for dirty screens/sunlight). Arabic-Indic numerals in Arabic context.

---

### Screen 1: Login

**First-time login:**
- Phone number input with Egyptian +20 prefix.
- OTP via WhatsApp primary, SMS fallback (30s), voice call fallback (60s).
- 6-digit OTP input with auto-advance.
- On successful OTP: prompt biometric enrollment. "Enable fingerprint/face login for faster access?" with [Enable] / [Skip] buttons.
- If enabled: biometric credential stored via `@capgo/capacitor-native-biometric`.

**Subsequent logins:**
- App opens directly to biometric prompt (fingerprint or face).
- One tap. In.
- If biometric fails (dirty fingers, gloves): 6-digit PIN fallback.
- If PIN fails 3 times: fall back to phone OTP.

**Session:** 12-hour JWT expiry. Driver does not need to re-authenticate during shift. Session ends on explicit logout or 12 hours of inactivity.

**External driver registration:**
- "Register as External Driver" button on login screen.
- Separate onboarding flow: personal info, national ID photos (front + back via Capacitor Camera), selfie for verification, driving license photos, vehicle information (5 photos minimum), insurance document photo, bank/payment info.
- Terms acceptance: independent contractor agreement, delivery standards, safety requirements, GPS consent.
- Verification: 24-72 hours by operations team. Push notification on approval.

**Layout:**
- HyperQuote logo centered at top.
- Phone input: large (56dp height), centered.
- OTP input: 6 large digit boxes (48dp each).
- Biometric prompt: native OS dialog.
- PIN: custom numeric keypad with 56dp buttons.

**Offline behavior:** Login requires network. "No connection. Please check your network." with retry button.

**RTL/Arabic:** All labels from i18n. Numeric keypad layout unchanged. Phone number direction LTR always (international convention).

---

### Screen 2: Shift Start

**Trigger:** After login on a new day, or when driver taps "Start Shift" from home dashboard.

**Pre-shift device health check (automatic, before anything else):**
- Battery level check: if < 50%, warning: "Battery is at {X}%. Charge your device before starting. Deliveries require at least 50% battery." Continue button enabled but warning persists.
- GPS check: attempt to get a location fix. If GPS unavailable: "GPS not working. Deliveries require GPS. Check location settings." Block shift start until GPS works.
- App version check: if outdated, force update prompt.
- Camera check: quick test of camera access. If denied, prompt to enable in settings.

**Vehicle selection:**
- Pre-assigned vehicle shown: "Truck #HQ-017 (Flatbed + Moffett, Mitsubishi Fuso)" in a large card.
- [Confirm] button (56dp, full width, blue).
- [Change Vehicle] secondary button → dropdown of available vehicles from dispatch.
- If vehicle changed: dispatch notified automatically.
- External drivers: skip this step (they use their own vehicle, already registered).

**Pre-trip inspection (10-item DVIR -- HyperQuote internal policy, no Egyptian legal requirement):**

Organized by vehicle area. Each item has a **Pass / Fail / N/A** toggle with giant touch targets (56dp buttons, green/red/gray).

**10-item checklist:**
1. Tires (tread, inflation, damage)
2. Lights (headlights, taillights, turn signals, reflective tape)
3. Mirrors (both sides, clean, adjusted)
4. Brakes (pedal feel, parking brake)
5. Fluid levels (oil, coolant, visible leaks)
6. Horn and wipers
7. Fire extinguisher (present and charged)
8. Load securement equipment (straps, chains, edge protectors)
9. Cab condition (seatbelt, A/C working, gauges)
10. Moffett / specialized equipment (if applicable -- hydraulics, forks, fuel, tires)

**For each item:**
- Pass (green) / Fail (red) / N/A (gray) toggle.
- Camera button appears on Fail → photo required for any defect.
- Severity on Fail: Minor (can still operate) / Major (vehicle cannot leave).
- Notes field (optional text input, large keyboard).

**Major defect flow:**
- Vehicle flagged out of service in the system.
- Dispatch notified immediately.
- Driver prompted to select a different vehicle or wait for reassignment.
- The truck is blocked from departure until maintenance clears the defect.

**Odometer entry:**
- Large numeric input (React Aria `NumberField`). Geist Mono, 48dp height.
- Photo of odometer reading (via camera button) for verification.

**Sign-off:**
- "I confirm this inspection is complete and accurate."
- Digital signature capture: full-screen canvas, finger-optimized.
- Inspection timestamped (Geist Mono) + GPS-tagged (depot coordinates).
- Auto-submitted to fleet manager + maintenance queue.

**Previous day's post-trip inspection visible** for reference at the top of the screen (collapsible). Open defects highlighted in red.

**External driver variation:**
- Simplified self-inspection: 5 items (tires, lights, brakes, load securement, general condition).
- No odometer entry required.
- Confirmation: "My vehicle is safe for this delivery."

**Layout:** Single scrollable screen. Giant buttons. Each checklist section is a card with clear visual separation. Progress indicator at top: "4 of 10 checked."

**Offline behavior:** Full inspection works offline. Data stored locally. Syncs to server on next connection.

**RTL/Arabic:** All checklist labels from i18n. Toggle buttons are icon+label, layout mirrors.

---

### Screen 3: Home Dashboard

**URL state:** Default screen after shift start.

**Layout:** Single card design. One delivery at a time.

```
TODAY'S ROUTE
6 stops | ~185 km | Est. finish: 2:45 PM
Total weight: 18,400 kg

First stop: Al-Nour Construction
  6th October City | ETA 7:15 AM
  Cement + Rebar | Moffett unload

Special notes from dispatch:
  "Stop #3 -- new site, no previous delivery data.
   Call foreman 15 min before arrival."

[Start Route]                        (56dp, full-width, blue)

[View Full Route]  [Messages (2)]  [Contact Dispatch]
```

**Data displayed:**
- Total stops remaining (Geist Mono 500, large).
- Total estimated distance + estimated finish time (Geist Mono 400).
- Total weight on truck vs. truck capacity (Geist Mono 400).
- First stop preview card: customer name (Inter 600), address (Inter 400), ETA (Geist Mono 500), materials summary (Inter 400), unloading method icon.
- Special notes from dispatch: highlighted in a subtle yellow-50 bg container (semantic warning).
- Unread messages badge on Messages button.

**Vehicle info strip:** At the top, compact: "Truck #HQ-017 | Flatbed + Moffett" in Inter 400, muted gray.

**Status indicator:** Driver status in a small badge: "On Duty -- Not Driving" (auto-updates based on motion detection).

**Buttons:**
- [Start Route]: 56dp, full-width, blue bg, white text. Transitions to Route Overview (Screen 4).
- [View Full Route]: secondary text button.
- [Messages]: secondary text button with unread count badge.
- [Contact Dispatch]: one-tap button → opens phone dialer to dispatch number via `tel:` link.

**Offline behavior:** All route data synced to local SQLite via PowerSync before departure. Dashboard fully functional offline.

**RTL/Arabic:** Full mirror. Button layout maintained at bottom.

---

### Screen 4: Route Overview

**Layout:** Two views, toggleable:

**Map view (default):**
- MapLibre GL map filling upper 60% of screen.
- Numbered pins at each stop location. Color-coded: Gray = pending, Green = completed, Blue = current/next, Red = failed/skipped.
- Route path highlighted on map in blue.
- Traffic overlay (real-time when online, hidden when offline).
- Current location shown as blue dot.

**List view (swipeable bottom sheet, 40% of screen by default, expandable to full):**
```
Stop 1  Al-Nour Construction              ETA 7:15 AM
        6th October City | Cement + Rebar | Moffett
        [Navigate]

Stop 2  Delta Engineering                  ETA 8:30 AM
        Sheikh Zayed | Plywood + Drywall | Manual
        [Navigate]

...

Route stats: 6 stops | 185 km | Est. finish 2:45 PM
```

Each stop row: 56dp minimum height. Stop number (Geist Mono, large), customer name (Inter 600), address (Inter 400), ETA (Geist Mono 500), materials summary (Inter 400), unloading method icon (Moffett/boom/manual/crane).

**Status per stop:** Pending / En Route / Arrived / Completed / Failed / Skipped. Color-coded pins and text.

**Route change acknowledgment:** If dispatch modifies the route while driver is en route, a push notification fires. The app shows an overlay: "Route updated by dispatch. Stop #4 removed. New estimated finish: 2:15 PM." [Acknowledge] button (56dp). Driver must acknowledge before proceeding. Route change logged.

**Interactions:**
- Tap [Navigate] on any stop → launches navigation (Screen 6).
- Tap stop row → opens Stop Detail (Screen 5).
- Drag-and-drop stop reordering: long-press + drag. Requires dispatch approval. On reorder: "Route change request sent to dispatch. Waiting for approval." Dispatch approves/rejects in internal app.
- **Skip stop:** Each stop card in the list view has a "Skip to Next" button (Lucide `SkipForward` 20px, text button, `var(--color-text-muted)`, 48dp touch target). On tap: confirmation dialog (elevated overlay): "Skip this stop? It will be moved to the end of your route." — Inter 500 16px. [Cancel] (outline, 48dp) + [Skip] (amber bg, 48dp).
  - On confirm: stop moves to the end of the route list. Route recalculates ETAs for remaining stops. Dispatch is notified automatically (in-app notification + `delivery_events` log entry with reason `DRIVER_SKIPPED`). The skipped stop shows a "Rescheduled" badge (Inter 500 11px, amber bg, rounded-full).
  - Skip reasons (optional): after confirming skip, a quick-select appears: "Customer not available" / "Access blocked" / "Safety concern" / "Other" (free text). Selected reason is sent to dispatch.
  - Skipped stops can be un-skipped by tapping the stop and selecting "Move back to original position" (requires dispatch approval if route has progressed past the original slot).
  - Driver can also drag stops to reorder (existing long-press + drag behavior). Non-adjacent moves require dispatch approval. Adjacent swaps (next stop ↔ following stop) are auto-approved.

**Offline behavior:** Map uses pre-cached PMTiles. Stop data from local SQLite. Traffic overlay hidden. ETAs calculated from cached distances (less accurate).

**RTL/Arabic:** Map labels in Arabic (MapTiler Arabic labels). List view mirrors. Stop numbers remain in standard numerals (or Arabic-Indic per locale).

---

### Screen 5: Stop Detail

**Trigger:** Geofence auto-expand at ~500m from delivery site (via `@transistorsoft/capacitor-background-geolocation`). Or manual tap from Route Overview.

**Layout:**
```
STOP #1 -- Al-Nour Construction                     [Back]

Contact: Eng. Hassan (Foreman)
  Phone: 010-XXXX-XXXX                              [Call]

Address: Plot 47, Industrial Zone B, 6th October City

Delivery window: 7:00-9:00 AM                       [On time]

Access instructions:
  Enter through Gate #2 (south side).
  Tell security "HyperQuote delivery."
  Gate code: 4521

PPE Required: Hard hat, safety vest, steel-toed boots
  [x] I acknowledge PPE requirements

Unloading: Moffett
  "Place cement on the east side of the foundation slab.
   Rebar bundles near the column line."

Previous delivery notes:
  "Ground firm. Adequate space for Moffett.
   Watch for excavation trench on the north side."

Previous site photos:                     [View 3 photos]

Items to deliver:
  50x Cement bags (50kg each) -- 2,500 kg
  20x Rebar bundles (12mm, 12m) -- 1,800 kg

[Navigate]    [Call Site Contact]    [Arrived]

[Report Issue]
```

**Data displayed:**
- Customer name and company (Inter 600).
- Site contact name and phone (masked -- customer never sees driver's personal number). [Call] triggers phone dialer via Capacitor `CallNumber` plugin.
- Full address with plus code / what3words pin if available.
- Delivery window with on-time/late indicator (semantic green or yellow/red).
- Access instructions: gate code, entry point, security procedures.
- PPE acknowledgment checkbox: must be checked before [Arrived] becomes active.
- Unloading method: Moffett / Boom / Manual / Site Equipment with specific placement instructions.
- Previous delivery notes from historical visits (critical for repeat sites).
- Previous site photos (from past drivers' POD captures).
- Items manifest: itemized with quantities and weights in Geist Mono.

**Cairo truck ban indicator:**
- If delivery is within Greater Cairo AND vehicle is 5+ tons AND current time is 6:00 AM - midnight:
  - Red banner at top: "NIGHT DELIVERY ZONE -- Heavy vehicles banned 6AM-midnight in Cairo"
  - If dispatched correctly, this delivery should be in the midnight-6AM window. Banner serves as safety check.
- If delivery is correctly scheduled in the midnight-6AM window: "Night delivery zone -- scheduled 12:00 AM - 6:00 AM" in Inter 400, muted gray.

**Interactions:**
- [Navigate]: launches Sygic/HERE (Screen 6).
- [Call Site Contact]: phone dialer. Number is masked via the backend (driver sees display number, not real customer number).
- [Arrived]: records arrival timestamp + GPS. Notifies dispatch + customer. Enables delivery flow.
- [Report Issue]: opens Exception Reporting (Screen 11).

**PPE acknowledgment:** Must be checked before [Arrived] button is enabled. Unchecked state: [Arrived] button hidden (not grayed out -- hidden).

**Offline behavior:** All stop data available from local SQLite. Previous photos cached if previously downloaded. Call functions work natively. GPS geofence works offline.

---

### Screen 6: Navigation

**Implementation:** The driver app does NOT include built-in turn-by-turn navigation. It launches an external truck-safe navigation app.

**Launch flow:**
1. Driver taps [Navigate].
2. App checks for installed navigation apps (Sygic Truck Navigation preferred, HERE WeGo as fallback).
3. Launches the selected app with destination coordinates via deep link / intent.
4. If neither is installed: prompt to download Sygic from app store. "Google Maps and Waze do not support truck-safe routing. Please install Sygic for safe navigation."

**What the driver app shows during navigation:**
- Minimal overlay bar at top (persistent notification on Android, no overlay on iOS -- uses background activity indicator).
- Bar content: "Navigating to Al-Nour Construction | ETA 7:15 AM" in Inter 400.
- [Call Customer] button accessible from the notification bar.
- Background GPS tracking continues independent of the navigation app.

**Truck-safe routing features (via Sygic/HERE):**
- Weight-restricted bridges avoided.
- Low clearance underpasses avoided.
- Truck-prohibited roads avoided (residential areas, narrow streets).
- Cairo-specific: Ring Road truck ban enforcement.
- Voice guidance in Arabic.

**Traffic scenario handling:**
- If ETA jumps beyond delivery window, the driver app detects via GPS progress and alerts dispatch automatically.
- Push notification to driver: "Running late for Stop #1. New ETA: 7:40 AM. Dispatch has been notified."
- If still within window: no alert.

**Offline behavior:** Sygic supports offline maps natively. The driver app's GPS tracking works offline. PMTiles cached for the route overview map.

---

### Screen 7: Loading Verification

**Trigger:** At the warehouse before departure. Accessed from home dashboard or triggered when dispatch marks load as "staged."

**Layout:**
```
LOAD PLAN -- Truck #HQ-017

Loading sequence:
  Load Order #2089 FIRST (last delivery)
  Load Order #2085 SECOND
  Load Order #2091 LAST (first delivery -- on top)

ORDER #2091 (First delivery)                    [Scan]
  Customer: Al-Nour Construction
  [ ] 50x Cement bags (50kg) -- 2,500 kg
  [ ] 20x Rebar bundles (12mm, 12m) -- 1,800 kg

ORDER #2085 (Second delivery)                   [Scan]
  Customer: Delta Engineering
  [ ] 40x Plywood sheets (18mm) -- 1,600 kg
  [ ] 30x Drywall sheets (12.5mm) -- 900 kg

ORDER #2089 (Last delivery)                     [Scan]
  Customer: Pyramid Contractors
  [ ] 15x Lumber bundles (treated pine) -- 4,500 kg
  [ ] 8x Steel beam (IPE 200, 6m) -- 2,100 kg

TOTAL: 18,400 kg / 22,000 kg capacity (83.7%)

[Take Loaded Truck Photo]
[Take Cargo Securement Photo]

Weight verification: [Enter scale reading]

Damage check: Any damage visible before departure?
  [No]  [Yes -- report]

[I confirm this load is correct and secured]     (signature)
[Ready to Depart]
```

**Barcode scan mode:**
- Tap [Scan] per order or per item.
- Camera activates via `@capacitor-mlkit/barcode-scanning`.
- Points at QR code on pallet tag. Scan: <0.2 seconds.
- Green checkmark for match. Red alert for mismatch or unknown barcode.
- For items without barcodes (loose rebar, bulk): switch to manual check mode. Tap to confirm count.

**Shortage handling:**
- If scanned count < manifest count: app shows "SHORT {N} -- Expected {X}, Loaded {Y}" in semantic error color.
- [Report Shortage] button. Opens a quick form: reason (damaged, not available, other) + notes.
- Dispatch notified. Shortage documented before departure.

**Photos:**
- "Loaded truck" photo: wide shot of entire load. Required.
- "Cargo securement" photo: showing straps, chains, edge protectors. Required.
- All photos auto-tagged with GPS (depot) + timestamp via Capacitor Camera plugin.

**Weight verification:**
- Manual entry from scale ticket reading (Geist Mono input, large).
- App compares to calculated manifest weight. Tolerance: +/- 2%.
- If overweight beyond truck GVWR: red alert, block departure, notify dispatch.
- "Weight OK -- 83.7% of capacity" in Inter 400, muted gray (or semantic warning at > 90%).

**Damage check:**
- "No" (green) / "Yes -- report" (red). Giant buttons.
- If Yes: opens camera + damage category selection + affected items.

**Sign-off:**
- "I confirm this load is correct and secured" -- checkbox.
- Digital signature: full-screen canvas, finger-optimized.
- [Ready to Depart]: enabled only after all items checked + photos taken + weight entered + signature captured.

**Offline behavior:** Fully functional offline. All manifest data from local SQLite. Photos stored locally. Sync on next connection.

---

### Screen 8: Arrival

**Trigger:** Geofence auto-detect at 150-300m radius around delivery site. Or manual [Arrived] tap from Stop Detail.

**Geofence auto-detect:**
- `@transistorsoft/capacitor-background-geolocation` geofence fires.
- App vibrates + notification: "Arriving at Al-Nour Construction. Tap to check in."
- If driver taps: arrival recorded.
- If driver does not tap within 2 minutes while within geofence: automatic arrival recorded (configurable).

**Manual arrival:**
- [Arrived] button on Stop Detail screen. 56dp, green bg, white text.
- Requires PPE acknowledgment checkbox to be checked.

**On arrival:**
- Timestamp recorded (Geist Mono).
- GPS coordinates captured.
- Dispatch notified: "Driver #Mohammed arrived at Stop #1."
- Customer notified (if configured): automated WhatsApp/SMS: "Your HyperQuote delivery driver has arrived."

**Contact customer before arrival:**
- At ~500m (geofence trigger), app shows prominent [Call Site Contact] button.
- Approach call template: driver calls to confirm readiness.

**Offline behavior:** Arrival recorded locally with GPS + timestamp. Syncs to server on next connection. Customer notification queued.

---

### Screen 9: Delivery Execution

**Trigger:** After arrival confirmation.

**Layout:**
```
DELIVERING TO: Al-Nour Construction               Stop #1

Unloading method: Moffett
Timer: 00:00 (starts on first item confirmed)

Items:
  [ ] 50x Cement bags (50kg)              [48 delivered]
  [ ] 20x Rebar bundles (12mm, 12m)       [20 delivered]

Item actions per line:
  [Tap to confirm full quantity]
  [Adjust quantity]  (number input for partial)
  [Flag damage]      (opens damage report for this item)

Unloading notes:
  "Place cement on east side of foundation slab.
   Rebar bundles near column line."

[Mark delivery complete -->]
```

**Line-item confirmation:**
- Tap item row to confirm full quantity delivered. Green checkmark appears.
- Tap "Adjust quantity" to enter actual delivered quantity (for partial delivery). Geist Mono number input.
- Tap "Flag damage" per item → opens damage checkbox + photo capture for that specific item.

**Unloading timer:** Starts when first item is confirmed. Tracks total unloading duration for performance metrics. Geist Mono display, large.

**Partial delivery:**
- If any item quantity is less than expected: app shows "Partial delivery" indicator.
- Reason code required per item: "Damaged at warehouse", "Not loaded", "Customer request", "Other."
- Undelivered items tracked for follow-up (rescheduled delivery).

**Completion:** [Mark delivery complete -->] enabled only when all items have a status (confirmed, adjusted, or flagged). Leads to POD Capture (Screen 10).

**Offline behavior:** Fully functional offline.

---

### Screen 10: POD Capture (Proof of Delivery)

**Trigger:** After marking delivery complete on Screen 9.

**Layout:**
```
PROOF OF DELIVERY                                    Stop #1
Al-Nour Construction

Photos (required, minimum 1):
  [Take Photo 1]  [Take Photo 2]  [Take Photo 3]
  (thumbnails appear after capture)

Signature:
  [Open signature pad]
  Name: [text input -- receiver's name]
  Title: [dropdown -- Foreman / PM / Engineer / Owner / Other]

Quantity confirmation:
  [x] Cement bags -- 48 of 50 (SHORT 2)
  [x] Rebar bundles -- 20 of 20

Condition:
  ( ) Materials delivered in good condition
  ( ) Damage noted (see photos)

Quick notes:
  [All items delivered as ordered]
  [See damage photos]
  [Placed per customer instructions]
  [Free text input]

                    ==================>
                    SWIPE TO COMPLETE
                    ==================>
```

**Photos:**
- Minimum 1 required. Up to 6.
- Recommended: (1) wide shot of materials at placement, (2) close-up of material condition, (3) site context.
- Auto-tagged with GPS + timestamp via Capacitor Camera.
- Compressed on-device: 1920px max width, JPEG 0.7 quality. Approx 1-2MB per photo.

**Signature:**
- Full-screen signature pad. Large canvas optimized for finger input.
- "Print name" field: text input (Inter 400, 48dp height).
- "Title/role" dropdown: React Aria `Select`. Options: Foreman, Project Manager, Site Engineer, Owner, Superintendent, Other.
- Signature is legally valid under Egyptian E-Signature Law 15/2004 (app-based signature + GPS-tagged photos = strong evidence).

**Quantity confirmation:**
- Pre-filled from delivery execution (Screen 9).
- Shows shortages: "48 of 50 (SHORT 2)" with shortage reason.
- Receiver's count vs. shipped count: if discrepancy, flag for dispatch.

**Condition statement:**
- Radio group: "Good condition" / "Damage noted."
- If damage noted: must have damage photos and/or damage report from Screen 9.

**Quick notes:**
- Pre-defined one-tap notes (Inter 400, pill-shaped buttons). One tap to add.
- Free-text input for additional notes (48dp, full width).

**Swipe to complete:**
- Full-screen-width swipe gesture. Slider track with arrow. Must swipe from start to end (minimum 80% of width).
- Prevents accidental completion.
- On complete: POD stored locally in SQLite immediately. Queued for upload to Supabase Storage (photos) + Supabase DB (POD record).

**HyperQuote-branded delivery note:**
- App generates delivery note PDF containing: HyperQuote logo, order number, date, address, itemized materials with quantities, shortage notations, driver name + signature, receiver name + signature + title, GPS coordinates, photo thumbnails.
- Available to customer via portal and shareable via WhatsApp.
- NO prices on delivery note (prices are the margin secret, not the supplier identity).

**Automated notifications on POD:**
- Dispatch: delivery completion notification.
- Customer: automated WhatsApp/SMS: "Your delivery is complete. View your delivery note at [portal link]."
- Finance: triggers invoice generation workflow.

**Offline behavior:** Full POD capture works offline. Photos stored locally (compressed). Signature stored as PNG. All data queued for sync. "POD saved. Will sync when connected." indicator.

---

### Screen 11: Exception Reporting

**Trigger:** [Report Issue] button available on Stop Detail, Delivery, and Route Overview screens.

**7 exception types with guided workflows:**

**1. Customer Unavailable**
```
Exception: No One to Receive

Did you call the site contact?
  [Yes, _ attempts at _:_ AM]          (auto-filled from call log)

Did you try an alternate contact?
  [Yes, called office at _:_ AM]  [No alternate available]

Response received?
  [Contact will be available in ~_ minutes]
  [No response]

Timer: 15-minute mandatory wait started.
  Wait time remaining: 12:34

Can you wait?
  App calculates impact on remaining stops:
  "If you wait 60 min, estimated finish shifts to 3:30 PM"

[Wait]  [Skip and Return Later]  [Mark Failed -- Return to Warehouse]
```

**2. Site Blocked**
```
Exception: Access Blocked

[Take photo of obstruction]           (required)

Type of blockage:
  ( ) Gate locked
  ( ) Construction barrier
  ( ) Road closure
  ( ) Flooding
  ( ) Other

Called site contact: [Yes/No]
Resolution: [Waiting for someone to open / No resolution / Alternate access]

[Wait]  [Skip]  [Mark Failed]
```

**3. Wrong Address**
```
Exception: Wrong Address

[Take photo of location]              (required)

What is at this location?
  [Text input]

Called customer for correct address: [Yes/No]
Correct address received?
  [Yes -- enter new address]  [No -- could not reach customer]

If new address received:
  App recalculates route. Shows distance and time impact.
  [Navigate to new address]  [Skip -- too far]
```

**4. Damaged Goods**
```
Exception: Damage Found

When discovered: [At loading / In transit / At delivery]

Affected items: (select from manifest)
  [ ] Cement bags
  [ ] Rebar bundles

Per item:
  Damage type: [Bent/Deformed / Broken / Wet / Crushed / Rusted / Other]
  Severity: [Minor / Moderate / Severe]
  Quantity affected: [number input]

Photos (minimum 2, recommended 4-6):
  [Take Photo] [Take Photo] ...

Who noticed: [Driver / Customer / Warehouse]

Notes: [text area]

Customer decision:
  ( ) Accepts undamaged portion, refuses damaged
  ( ) Refuses entire delivery
  ( ) Accepts all with damage notation

[Submit damage report]
```
Auto-notifies dispatch + claims team with photos.

**5. Partial Delivery (Customer Request)**
```
Exception: Customer Requests Partial Delivery

Customer says: [text input -- what they want/don't want]

Items customer WANTS now:
  [x] Cement bags
  [ ] Rebar bundles (not ready)

Contacted dispatch: [auto -- one-tap "Contact Dispatch" button]
Dispatch approved: [Yes / Waiting]

If approved: deliver accepted items. POD captures only delivered items.
Undelivered items: reason code "Customer request -- not ready"
```

**6. Weather Delay**
```
Exception: Weather Delay

Condition:
  ( ) Rain (heavy)
  ( ) Sandstorm (Khamsin)
  ( ) Extreme heat (>45C)
  ( ) High wind (>30 km/h -- affects sheet materials and crane ops)

Impact:
  ( ) Cannot drive safely
  ( ) Cannot unload safely (outdoor site)
  ( ) Materials at risk (cement in rain, sheets in wind)

[Take photo of conditions]

Contact dispatch: [auto -- one-tap]
```

Khamsin-specific: "Block deliveries of sheet materials (plywood, drywall) above 30 km/h wind."

**7. Vehicle Issue**
```
Exception: Vehicle Problem

Issue type:
  ( ) Engine failure
  ( ) Flat tire
  ( ) Hydraulic failure (Moffett/boom)
  ( ) Electrical issue
  ( ) Overheating
  ( ) Other

Severity:
  ( ) Can continue after minor fix
  ( ) Cannot continue -- need roadside assistance

[Take photos of issue]

Notes: [text area]

[Call Dispatch IMMEDIATELY]           (56dp, red bg, white text)
```

Driver safety prompts: "Are you safe? Pull over. Activate hazard lights. Set warning triangles."

**All exceptions:**
- Timestamped + GPS-tagged.
- Auto-notify dispatch.
- Photos required for most types.
- Resolution options presented based on exception type.
- Full audit trail in `entity_timeline`.

**Offline behavior:** All exception reporting works offline. Data queued for sync.

---

### Screen 12: Communication

**Layout:**
```
MESSAGES                                             [Back]

Dispatch                                    [Call Dispatch]
  Last: "Skip Stop #2, return later."
  [Open chat]

Warehouse
  [Open chat]

Stop #1 -- Al-Nour Construction            [Call Customer]
  [Open chat]

EMERGENCY                                  [Emergency Call]
```

**In-app messaging:**
- Chat threads: with dispatch (primary), with warehouse, per-customer per delivery.
- Pre-defined quick message templates (one-tap, minimize typing for gloved hands):
  - "On my way to stop #X"
  - "Running approximately [15/30/45/60] minutes late" (dropdown for minutes)
  - "Delivery complete"
  - "Cannot access site -- gate locked"
  - "Need dispatcher callback"
- Photo and voice message support.
- Read receipts (sender sees when message was read).

**Phone calls:**
- [Call Dispatch]: one-tap, direct to dispatch desk via `tel:` link.
- [Call Customer]: masked number. Driver never sees customer's real phone number. Call routes through backend masking service.
- [Emergency Call]: large red button. One-tap to Egyptian emergency services (123 ambulance, 122 traffic police). Also sends automatic alert to dispatch with GPS location.

**Automated system notifications (driver receives):**
- "Route updated by dispatch" (push, distinct sound).
- "Customer message received."
- "Delivery cancelled while en route."
- "Weather alert for your route area."
- "Break reminder -- you have been on duty for 8 hours."

**Critical alerts override Do Not Disturb** (Capacitor notification channel with "importance: high").

**Offline behavior:** Messages queued locally. Send when connected. Read receipts delayed. Phone calls work natively.

---

### Screen 13: End of Day

**Trigger:** Driver returns to depot. Taps "End Shift" from any screen (always accessible via a persistent menu button).

**Layout:**
```
END OF DAY -- Mohammed                     Mar 29, 2026

Returns
  3x IPE 200 Steel Beam (6m) -- Damaged, customer refused
  Linked to: Order #2089, Damage Report #DR-0472
  [Log return]  (quantity, reason code, linked order)
  Warehouse receiving team takes custody.

Fuel
  Fuel gauge: [1/4] [1/2] [3/4] [Full]
  Policy: minimum 1/2 tank at end of shift.
  If below: "Fill up before ending shift."
  Fuel receipt: [Take photo]  (optional)

Post-Trip Inspection (DVIR)
  Same 10-item checklist as pre-trip.
  Note any NEW defects found during the day.
  Digital signature.

Odometer (end):
  [Enter reading]  [Take photo]

Day Summary
  Stops completed:    6 of 6 (1 rescheduled)
  Stops failed:       0
  Total km driven:    207 km
  Total drive time:   4h 12m
  Total on-duty time: 9h 58m
  On-time delivery:   83% (5 of 6 within window)
  Exceptions logged:  2 (1 no-receiver, 1 damaged goods)
  Returns:            3 steel beams (damaged)

[End Shift]                              (56dp, full-width, red)
```

**Returns processing:**
- Each return: item, quantity, reason code (damaged, customer refused, not needed, other), linked order + damage report.
- Warehouse receiving confirmation: warehouse team confirms receipt of returned items.

**Post-trip DVIR:**
- Same 10-item checklist as pre-trip.
- Open defects from pre-trip shown at top.
- Any new defects: photo required, severity, auto-routed to maintenance queue.
- Digital signature to certify inspection.

**Day summary:**
- All values in Geist Mono 500.
- On-time percentage calculated from delivery window compliance.
- Pending items highlighted in yellow.

**End Shift:**
- [End Shift] button: 56dp, full-width, red bg (deliberate color -- end of shift is a terminal action).
- On tap: records clock-out time + GPS (depot). Stops background GPS tracking. Calculates total shift hours. Pushes all remaining queued data via PowerSync. Transitions driver status to "Off Duty."

**External driver variation:**
- No post-trip DVIR submitted to HyperQuote (their truck, their responsibility).
- No returns processing (single-job, not multi-stop).
- Job completion screen: "Job Complete. Earnings: EGP 850. [Back to Available Jobs]"

**Offline behavior:** Fully functional. All data stored locally. Final sync push on "End Shift" (if connected). If offline, data syncs on next app open with connectivity.

---

### Screen 14: External Driver -- Job Offer

**Audience:** ON_DEMAND and CONTRACTED drivers only. Internal drivers do not see this screen.

**Layout:**
```
AVAILABLE JOBS (3 nearby)

JOB #J-4521                              Countdown: 14:32
  Pickup: HyperQuote Depot, 10th of Ramadan City
  Delivery: Construction site, Shorouk City (22 km)
  Materials: 30x Cement bags (50kg), 10x PVC pipes (4m)
  Total weight: 1,650 kg
  Unloading: Manual (customer crew assists)
  Pay: EGP 850
  Pickup window: Today, 9:00-10:00 AM
  Delivery window: Today, 10:30 AM-12:00 PM

  [Accept Job]                    (56dp, green bg)
  [Decline]                       (text button, muted)

JOB #J-4523                              Countdown: 22:15
  Pickup: Supplier warehouse, Badr City
  Delivery: 2 stops in New Cairo (35 km total)
  Materials: Mixed -- tiles + adhesive
  Total weight: 2,800 kg
  Unloading: Manual
  Pay: EGP 1,200
  Pickup window: Today, 11:00 AM-12:00 PM

  [Accept Job]  [Decline]
```

**Job matching logic (invisible to driver):**
- Filtered by: vehicle type and capacity, driver GPS location (nearby pickups prioritized), driver rating (higher-rated see more/sooner), job requirements (equipment certifications).
- Jobs offered to multiple qualified drivers simultaneously.
- First to accept gets the job.
- "Job no longer available" if too slow.

**Countdown timer:** Geist Mono 500, large. Shows time remaining before the job expires or is assigned to someone else. Counts down in real-time.

**Accept flow:**
- Tap [Accept Job] → confirmation overlay: "JOB #J-4521 ACCEPTED. Pickup: HyperQuote Depot. Arrive by 9:45 AM. [Navigate to pickup]"
- GPS tracking begins for this job.
- Job moves to a dedicated "Active Job" view (same flow as Screens 3-10 but single-stop).

**After acceptance (detailed flow):**
- The accepted job appears immediately on the Home Dashboard (Screen 3) as the active delivery. The driver follows the same screens as internal drivers: Route Overview (Screen 4, single-stop), Stop Detail (Screen 5), Navigation (Screen 6), Loading Verification (Screen 7 — at pickup), Delivery Execution (Screen 9), POD Capture (Screen 10).
- **Dispatch reassignment window:** Dispatch can reassign the job within 30 minutes of acceptance. Driver receives a push notification: "This job has been reassigned. No penalty applied." The job disappears from the Active Job view and returns to the available jobs list (if still open) or is removed entirely.
- **Driver cancellation after 30 minutes:** "Cancel accepted job?" confirmation dialog. Warning text: "This will affect your reliability score." On confirm: -5 reliability points deducted. 3 cancellations within 30 days triggers a 7-day cool-off period (no new job offers). Cancellation reason required: "Vehicle issue" / "Personal emergency" / "Route impossible" / "Other".
- **Driver cancellation within 30 minutes:** No penalty. "Job cancelled. No penalty applied." Toast.
- **Job completion:** After POD is validated by dispatch, payment is added to earnings (Screen 15). A 48-hour hold applies before the amount becomes available for withdrawal. Toast: "Job #J-XXXX completed! EGP XXX added to earnings (available in 48h)."

**Decline flow:**
- Tap [Decline] → job disappears from list. No penalty for occasional declines. Frequent declines may lower priority in job matching.

**Contracted driver variation:**
- Jobs are "offered" (not claimed from pool). 30-minute acceptance window.
- Performance tracked via scorecard (on-time rate, POD compliance, damage rate).

**Offline behavior:** Job offers require network (real-time matching). "No connection -- job offers unavailable" message.

---

### Screen 15: External Driver -- Earnings

**Audience:** ON_DEMAND and CONTRACTED drivers only.

**Layout:**
```
EARNINGS                                             [Back]

This week:     EGP 4,250 (5 jobs)
This month:    EGP 17,800 (21 jobs)
Pending:       EGP 850 (Job #J-4521, awaiting validation)
Available:     EGP 3,400 (ready for withdrawal)

[Withdraw to Bank Account]              (56dp, blue bg)

History
  Mar 29 -- Job #J-4521 -- EGP 850 -- Pending
  Mar 28 -- Job #J-4518 -- EGP 1,200 -- Paid
  Mar 27 -- Job #J-4512 -- EGP 500 -- Paid
  Mar 26 -- Job #J-4508 -- EGP 900 -- Paid
  ...

Weekly breakdown:
  Week 1: EGP 3,800 (4 jobs)
  Week 2: EGP 4,100 (5 jobs)
  Week 3: EGP 5,650 (7 jobs)
  Week 4: EGP 4,250 (5 jobs, in progress)

Payout method: Bank transfer -- CIB Account ****4521
  [Change payout method]
```

**Earnings data:**
- All amounts in Geist Mono 500.
- Pending: jobs completed but awaiting dispatch validation (1-4 hours typically).
- Available: validated earnings ready for withdrawal.
- History: per-job breakdown with date, job ID, amount, status (Pending / Paid / Processing).

**Payout methods (Egypt-specific):**
- Bank transfer (1-2 business days).
- Cash at HyperQuote office (scheduled pickup).
- HyperQuote takes platform commission (driver sees net amount).
- Tax: driver's own responsibility as independent operator. HyperQuote withholds 5% (services rate per Egyptian tax law).

**Payout timing:**
- Per-job: payment credited after dispatch validates POD.
- Weekly settlement: accumulate and receive weekly (configurable).

**Withdrawal rules:**
- Minimum withdrawal: EGP 500. If available balance < 500: "Withdraw" button disabled with tooltip "Minimum withdrawal is EGP 500".
- Processing time: 1-3 Egyptian business days (Sunday-Thursday). Status shown in history as "Processing" with expected arrival date (Geist Mono 400).
- Auto-payout option: configurable in settings — weekly (every Thursday) or monthly (last Thursday of the month). Toggle in payout settings: "Auto-withdraw when balance exceeds EGP ___" (React Aria `NumberField`, default 2000, min 500).
- Withdrawal fee: none for standard bank transfer. EGP 10 for instant transfer (if available via payment provider — shown as separate option on the withdraw screen).
- Pending earnings: 48-hour hold after job completion before the amount moves from "Pending" to "Available". Pending amounts show a countdown: "Available in Xh" (Geist Mono 400, muted).
- **Earnings breakdown per job** (expandable row in History): base pay + distance bonus (if > 30km) + heavy load surcharge (if > 3,000kg) + night delivery premium (if delivery between 10PM-6AM, Cairo truck ban window). Each component on its own line with amount in Geist Mono 400.

**Rating impact:** Higher ratings = more job offers = more earning opportunities. Rating based on: on-time arrival, POD quality, customer feedback, damage rate. Shown as a star rating at top of earnings screen.

**Offline behavior:** Cached earnings data shown. Withdrawal requires network.

---

### Paper Backup Delivery Note Flow

**Trigger:** Device failure during delivery (phone breaks, overheats, battery dies).

**Physical equipment:** Every truck carries a pad of pre-printed HyperQuote-branded delivery notes in triplicate (white original + yellow copy + pink copy).

**Paper delivery note fields:**
- HyperQuote logo + company details (pre-printed).
- Date: ____________
- Order number: ____________
- Customer name: ____________
- Delivery address: ____________
- Items table: Item description | Qty ordered | Qty delivered | Condition
- Shortage/damage notes: ____________
- Driver name + signature + time: ____________
- Receiver name + signature + title + time: ____________
- White copy: stays with customer.
- Yellow copy: returns to HyperQuote office.
- Pink copy: stays in delivery note pad (driver's record).

**Post-device-recovery process:**
1. When device is back online, driver (or dispatch) manually enters the paper delivery data into the app.
2. Photos of the paper delivery note are uploaded as POD attachments.
3. The delivery record is reconciled with the paper trail.

**Device failure escalation (dispatch-side):**
- 5 minutes "dark" (no GPS signal): yellow alert on dispatch dashboard.
- 15 minutes "dark": orange alert. Dispatch attempts to call driver.
- 30 minutes "dark": red alert. Dispatch escalates to operations manager. If driver is unreachable, emergency procedures activated.

---

### WhatsApp POD Fallback Channel

**Trigger:** App POD capture fails (camera broken, storage full, app crash).

**Flow:**
1. Driver completes delivery using paper backup note.
2. Driver opens WhatsApp (personal or company phone).
3. Sends to designated HyperQuote dispatch WhatsApp number:
   - Photo of materials at placement location.
   - Photo of signed paper delivery note.
   - Text message: "Delivery complete. Order #{number}. Customer: {name}. {X} items delivered."
4. Dispatch manually creates POD record in internal app from WhatsApp media.
5. Driver records in app (when working): "POD submitted via WhatsApp fallback."

**WhatsApp Business API integration:** Incoming WhatsApp messages to the dispatch number are routed to the customer service queue in the internal app. Media (photos) are stored in Supabase Storage and linked to the delivery record.

---

### Cairo Truck Ban Implementation

**Rule:** Heavy trucks (5+ tons) BANNED from Cairo Ring Road 6:00 AM to midnight.

**Driver app enforcement:**
- When a heavy vehicle delivery is within Greater Cairo during banned hours:
  - Prominent red banner on Stop Detail: "NIGHT DELIVERY ZONE -- Heavy vehicles banned 6AM-midnight"
  - Navigation will NOT route through Ring Road during banned hours (enforced via Sygic/HERE truck profile configuration).
- When correctly scheduled in midnight-6AM window:
  - "Night delivery zone" indicator on Stop Detail.
  - Auto dark mode activates for night shifts.
  - High-visibility vest reminder in PPE checklist.
  - Dispatch confirms: adequate site lighting for unloading.

**Dispatch-side enforcement:**
- Auto-block scheduling of heavy deliveries in Cairo during 6AM-midnight.
- Alert if route plan violates the ban.
- Customer-facing delivery windows show "Night delivery: 12AM-6AM" for heavy materials in Cairo.
- Light deliveries (under 5 tons, box trucks) are exempt and can deliver during daytime.

---

### Night Delivery Safety (Cairo Truck Ban Window)

Drivers delivering between midnight-6AM in Cairo:
- High-visibility vests: mandatory (reminder in PPE checklist).
- Vehicle lighting: all lights must be functional (included in pre-trip DVIR).
- Emergency kit: flashlight, reflective triangles, first aid kit (pre-trip check item).
- Dispatch notification: driver notifies dispatch of departure + arrival during night window.
- Site lighting: dispatch confirms with customer that site has adequate lighting for unloading. If not, delivery rescheduled.
- Auto dark mode: driver app switches automatically during night shifts.
- Fatigue management: night shift drivers have a maximum 6-hour shift (not 10).

---

### Pre-Shift Device Health Check

Automated checks run before shift start is allowed:

| Check | Threshold | Action if Failed |
|-------|-----------|-----------------|
| Battery level | > 50% | Warning + continue allowed. "Charge your device. Battery at {X}%." |
| GPS | Must get a fix | Block shift start. "GPS not working. Check location settings." |
| App version | Must be current | Force update prompt. Block shift start until updated. |
| Camera | Must be accessible | Prompt to enable in system settings. |
| Storage | > 500MB free | Warning. "Low storage. Clear photos/videos to ensure POD capture." |

---

### Prayer Time Considerations

- 5 daily prayers (Fajr, Dhuhr, Asr, Maghrib, Isha) -- each 5-10 minutes.
- **Friday Jumu'ah: hard blackout 11:30 AM - 1:30 PM.** No deliveries, no customer calls, no warehouse operations.
- System integrates prayer-time API. ETAs include 10-15 minute buffer around prayer times.
- Delivery windows avoid prayer times automatically.
- Driver app shows prayer time in the route overview: "Dhuhr prayer: 12:15 PM -- 10 min buffer included in ETAs."

---

### Accident Procedures (Egyptian Context)

1. Driver checks for injuries. Calls 123 (ambulance) or 122 (traffic police) if needed.
2. Secures scene: hazard lights, warning triangles.
3. **Calls dispatch via phone immediately** (not app -- voice call).
4. Does NOT admit fault.
5. Documents: photos of all vehicles, damage, road conditions, license plates. Exchange info with other parties.
6. Waits for traffic police -- **mahdar (police report) is mandatory** for insurance claims on commercial vehicles.
7. In-app (when safe): Report Issue > Accident/Incident. Full incident report form.
8. Dispatch: notifies management, contacts insurance (within 48-72 hours), arranges vehicle recovery, reschedules affected deliveries.
9. Paper accident report form carried in every truck.
10. If driver detained (possible for fatal accidents under Egyptian law): dispatch arranges legal representation immediately.

---

### Shared UI Components (Driver App)

All components from `@hyperquote/ui` package, customized for driver app context:

| Component | Driver App Customization |
|-----------|------------------------|
| Button | 56-64dp minimum height, full-width for primary actions |
| Switch (toggle) | 56dp touch target, Pass/Fail/N/A in DVIR |
| NumberField | 48dp height, Geist Mono, large touch target |
| Select (dropdown) | 56dp trigger height, large option rows |
| TextArea | 48dp minimum height, large font |
| Signature pad | Full-screen canvas, thick stroke, finger-optimized |
| Camera button | 56dp, camera icon, one-tap capture |
| Swipe-to-confirm | Full screen width slider, 64dp height |
| Status badge | Semantic colors: green/yellow/red, pill shape |
| Quick message | Pill button, 44dp height, one-tap send |

---

### Offline Strategy Summary (Driver App)

| Data | Storage | Sync Method |
|------|---------|-------------|
| Route + stop data | Local SQLite via PowerSync | Bi-directional, real-time when online |
| POD records | Local SQLite + photo files on device | Upload queue with retry |
| GPS breadcrumbs | Local buffer (PowerSync) | Background sync every 30s when connected |
| Photos | Compressed JPEG on device storage | Upload queue, background sync |
| Map tiles | PMTiles on device (200-400MB for Cairo) | Pre-cached, updated monthly |
| DVIR inspections | Local SQLite | Upload on completion |
| Exception reports | Local SQLite | Upload with photos |
| Messages | Local queue | Send on next connection |

**Conflict resolution:** Driver is authority for delivery status. Dispatcher is authority for route changes. PowerSync handles conflicts; business logic resolves disputes.

**Photo management:** Photos compressed on-device (1920px max, JPEG 0.7). Purged from local storage 48 hours after successful sync. Storage warning at 500MB remaining.

---

### Egyptian Law Compliance Summary (Driver App)

| Requirement | Implementation |
|-------------|---------------|
| Labor Law 14/2025 (8h/day, 48h/week) | App tracks shift hours. Warning at 8h, hard limit configurable. Overtime: 135% day, 170% night, 200% holidays. |
| GPS tracking consent (Data Protection Law 151/2020) | Explicit consent during onboarding. Consent form stored. Internal drivers: tracked during shift only. External: tracked during active job only. |
| E-Signature Law 15/2004 | App-based digital signature + GPS-tagged photos = legally valid POD. |
| Drug testing (Decision 1741/2025) | Zero BAC for commercial drivers. Compliance tracked in HR module, not in driver app. |
| Cairo truck ban (Heavy vehicles 5+ tons) | Enforced in dispatch scheduling + driver app visual warnings. |
| Compulsory third-party liability (Insurance Law 155/2024) | Verified at onboarding. Monthly re-verification for contracted drivers. |
| Mahdar (police report) for accidents | Paper accident report form in every truck. App guides driver through accident documentation. |

---

## PART 3: CROSS-CUTTING SPECIFICATIONS

## CROSS-APP UX FLOWS

### CA.1 Password Reset / Account Recovery

**Portal (External):**
- "Forgot PIN" link on login screen.
- Flow: Enter phone → WhatsApp OTP sent → verify OTP → set new 6-digit PIN → redirect to login.
- If phone number changed: "Can't access this number?" link → shows support contact (WhatsApp + phone) with reference code for identity verification.

**Internal Platform:**
- "Reset Password" link on login screen.
- Flow: Enter email → magic link sent → click link → set new password (min 12 chars, complexity enforced) → redirect to login.
- Admin forced reset: Admin > Users > select user > "Force Password Reset".

**CEO App:**
- Same as Internal (shares internal auth pool / SSO).

**Driver App:**
- "Forgot PIN" on login screen → WhatsApp OTP to registered phone → verify → set new 4-digit PIN.
- Lost device: Admin deactivates old device token via Internal > Fleet > Drivers > "Revoke Device". Driver re-onboards on new device.

**Biometric Recovery (All Apps):**
- Biometric failure 3× → automatic fallback to PIN with message: "Biometric not recognized. Enter your PIN."
- PIN forgotten → "Forgot PIN" triggers OTP recovery flow. After recovery, biometric re-enrolled on next login.

---

### CA.2 Account Deletion & Data Export

**Portal:**
- Settings > Data & Privacy.
- **Delete Account:** OTP confirmation → warning dialog: "This will permanently delete your account. Orders in progress will complete. You will receive final invoices." → 30-day grace period (soft delete). User can cancel deletion during grace period. After 30 days: PII purged, transactional records anonymized.
- **Export My Data:** Generates downloadable `.zip` (JSON + CSV): profile, orders, quotes, invoices, addresses, communication log. WhatsApp notification when ready.

**Internal:** No self-deletion. Admin deactivates. Data retained per Egyptian labor law.

**Driver:** No self-deletion. Admin deactivates. Compliance records retained per regulations.

---

### CA.3 Form Submission Error Recovery

**Idempotency:** Every form generates a UUID idempotency key on mount. Server deduplicates — same key returns original response.

**Network Failure Mid-Submit:**
- Button transitions to "Retrying..." Automatic retry: 3 attempts, exponential backoff (1s → 2s → 4s).
- After 3 failures: banner "Submission failed. Your data is saved locally. **[Retry Now]** or close and resume later."

**Auto-Save Drafts (Multi-Step Forms):**
- Applies to: quote builder, payment recording, any form with 2+ steps.
- Auto-save to `localStorage` every 30 seconds and on step transition. Key: `draft:{formType}:{userId}`.
- On return with draft: "You have an unsaved draft from [date]. **[Resume]** **[Discard]**"
- Drafts expire after 7 days.

**Offline Submit Attempt:**
- Queued in IndexedDB. Banner: "You're offline. Your submission will be sent when you reconnect."
- On reconnect: queued submissions sent in order. Success → toast. Failure → retry logic.

---

### CA.4 First-Time User Onboarding

**Portal (First Login):**
- Welcome overlay (Elevated glass, 420px): "Welcome to HyperQuote. Ask me anything — I can help you get quotes, track orders, or browse materials." + **[Got it]** button. No multi-step tour. AI chat includes suggestion chips on first open. `localStorage` flag, never shown again.

**Internal (First Login):**
- Tooltip sequence on first 3 interactions: (1) icon strip: "Press S for Sales, W for Warehouse..." (2) Ctrl+K area: "Search anything with Ctrl+K" (3) "Press ? for all shortcuts". Each dismissable. `localStorage` flag.

**CEO:** No onboarding — search bar is self-explanatory.

**Driver:** First-time mandatory vehicle inspection tutorial before first shift. Step-by-step with example photos.

---

### CA.5 Settings Pages (All Apps)

**Portal Settings (glass window):**

| Section | Contents |
|---------|----------|
| Profile | Name, phone (read-only verified), email, company, tax ID |
| Addresses | Delivery addresses CRUD, set default, map pin |
| Team | Multi-user (owner only): invite via phone, roles (Owner/Buyer/Viewer), remove |
| Notifications | Toggle matrix: event types × channels (WhatsApp/Email/Push) |

**Default notification preferences (new account):**

| Event Type | WhatsApp | Email | Push | In-App |
|-----------|----------|-------|------|--------|
| Quote ready | ON | ON | ON | ON |
| Order status change | ON | OFF | ON | ON |
| Delivery update | ON | OFF | ON | ON |
| Invoice received | ON | ON | OFF | ON |
| Payment confirmed | ON | ON | OFF | ON |
| Support response | ON | OFF | ON | ON |
| Promotional | OFF | OFF | OFF | OFF |

- WhatsApp is the primary notification channel (99.5% delivery rate in Egypt, per RESEARCH.md). Enabled by default for all transactional events.
- Email is enabled by default only for financial documents (quotes, invoices, payment confirmations) — these serve as receipts.
- Push notifications are enabled for time-sensitive events (quote ready, order changes, delivery updates, support responses) but NOT for financial documents (to reduce notification fatigue).
- In-App notifications are ON for everything except promotional — they serve as the activity log.
- Promotional notifications are OFF by default for all channels (opt-in only, GDPR/Egyptian data protection compliance).
- Users can override any default from the Settings > Notifications toggle matrix. Changes are persisted server-side in `notification_preferences` table.
- Suppliers have the same defaults with additional event types: "New PO received" (ON for WhatsApp + Push + In-App), "PO reminder" (ON for WhatsApp + In-App), "Payment sent" (ON for all).
| Language & Theme | AR/EN, Light/Dark. Persisted server-side. |
| Security | Change PIN, enable/disable biometrics, active sessions, "Sign out all" |
| Data & Privacy | Export data, delete account (CA.2), privacy policy link |

**Internal Settings (glass window):**

| Section | Contents |
|---------|----------|
| Profile | Name, department (read-only), contact info |
| Notifications | Per-module toggles, per-severity (all/critical/none) |
| Language & Theme | AR/EN, Light/Dark |
| Security | Change password, MFA setup (TOTP), active sessions |
| Display | Density (Compact/Comfortable), date format (DD/MM/YYYY default), numeral style |

**Driver Settings:**

| Section | Contents |
|---------|----------|
| Profile | Name, phone (read-only), photo |
| Vehicle | Assigned vehicle details (read-only) |
| Notifications | Delivery alerts, route changes, shift reminders toggles |
| Language & Theme | AR/EN, Light/Dark, auto dark mode (night shift) |
| Offline Storage | "Cached: X MB" + [Clear Cache] with warning |
| About | App version, support contact, terms link |

---

### CA.6 Ctrl+K Command Palette (Cross-App)

**Internal:** Documented in SHELL section.

**Portal:** `Ctrl+K` opens Elevated glass overlay (560px). Searches: orders, quotes, products, invoices, support tickets. Quick actions when empty: "New Quote Request", "Track Order", "Contact Support". Results grouped by type (max 5 per group). Arrow keys navigate, Enter selects, Escape closes.

**CEO:** No separate Ctrl+K — `/` focuses search bar which IS the command interface.

**Driver / Website:** No command palette.


## BUSINESS LOGIC ENFORCEMENT

### BL.1 Payment Instrument Requirement

**No order proceeds to fulfillment without a payment instrument on file.**

| Customer Tier | Required Instrument Before Order |
|--------------|----------------------------------|
| Tier 1 (New) | 100% advance wire transfer (confirmed) |
| Tier 2 (Verified) | 50% advance wire + 50% post-dated cheques |
| Tier 3 (Established) | Post-dated cheques covering full amount OR LC |
| Tier 4 (Preferred) | Net 30 terms (no advance, cheques on delivery) |
| Tier 5 (Suspended) | Cash before delivery only |

**Frontend enforcement:**
- After customer accepts quote, "Confirm Order" button is BLOCKED until payment instrument is uploaded/recorded.
- Banner: "To confirm this order, please provide [instrument type per tier]. [Upload Cheque Images] [Enter Wire Reference] [Upload LC]"
- Wire transfer: customer enters reference number + bank + date. Finance team verifies against bank statement before order proceeds.
- Post-dated cheques: customer uploads cheque photos (front + back). Finance records cheque details.
- Letter of Credit: customer uploads LC document. Finance validates terms.
- Internal view: order card shows "⚠ Awaiting Payment Instrument" badge until instrument received.

### BL.2 Cancellation Policy by Fulfillment Stage

**Tiered cancellation — customer-facing in Portal, enforced in Internal:**

| Stage | Cancellable? | Fee | UI Behavior |
|-------|-------------|-----|-------------|
| Before PO sent | Yes | Free | `[Cancel Order]` button visible. Immediate. |
| PO sent, not confirmed | Yes | 5% restocking | Warning: "A 5% cancellation fee (EGP X) applies." |
| Supplier confirmed / in production | Partial | Items in production: non-cancellable | "Items 1-3 can be cancelled. Item 4 (in production) cannot be cancelled. [Cancel Available Items]" |
| Shipped / in transit | No | Full amount | "This order is in transit and cannot be cancelled. Contact support for return options." |
| Non-stock / custom items | Never | Full amount | These items marked "Non-Cancellable" at quote acceptance. |

**Internal view:** Cancel request creates `CANCELLATION_REQUESTED` status. Ops reviews PO states. Approved → calculates fees → credit note if needed.

### BL.3 ETA E-Invoicing Validation

**Pre-send validation checklist (visible in Finance invoice detail):**
- ✓ Seller TRN (9 digits, pre-filled from company settings)
- ✓ Buyer TRN (9 digits, from customer profile — required field at onboarding)
- ✓ All line items have EGS/GPC product codes
- ✓ Invoice date, due date, delivery reference present
- ✓ Arabic text present (bilingual invoice with Arabic primary)
- ✓ Digital signature applied (HSM or ITIDA)

**If any check fails:** `[Send to Customer]` button disabled. Red alert: "ETA validation failed: [specific issue]. Fix before sending."

**Post-send status:** "ETA: Submitted" → "ETA: Accepted" or "ETA: Rejected — [error code + message]". Rejected invoices require correction and re-submission.

### BL.4 Supplier Onboarding Tiers

**Three tiers — not all suppliers use the portal:**

| Tier | Interface | How It Works |
|------|-----------|-------------|
| **Tier 1: WhatsApp Only** | AI-powered WhatsApp bot | Supplier sends price lists as photos/PDFs → Mistral OCR parses → AI structures into catalog. PO notifications via WhatsApp. Confirmations via reply. No portal login needed. |
| **Tier 2: Simplified Portal** | Magic link, reduced UI | Email/WhatsApp magic link → simplified portal (stock, POs, invoices only). No registration form. Auto-created account. |
| **Tier 3: Full Portal + API** | Full portal.hyperquote.net supplier view | Complete self-service: catalog management, stock updates, PO inbox, invoice submission, analytics. Optional API/webhook integration. |

**EDI: Deferred to Phase 2+.** Not available at launch. Portal + WhatsApp replaces EDI for Egyptian/ME regional suppliers.

### BL.5 Delivery Model (Phase 1: Drop-Ship)

**Phase 1 (Launch): No owned fleet. Three delivery methods:**

| Method | Description | When Used |
|--------|-------------|-----------|
| **Supplier Direct** | Supplier delivers directly to customer site | Default for 80%+ of orders. HyperQuote branded delivery note, dual-confirmation POD. |
| **3PL Partner** | Third-party logistics provider | Multi-supplier consolidated orders, areas without supplier delivery. |
| **Customer Pickup** | Customer arranges own transport | Customer requests at quote stage ("I'll arrange pickup — reduce price"). |

"Own Fleet" and "Internal Driver" options are Phase 2 features (after $5-10M revenue). UI should NOT show these at launch. Dispatch module manages supplier-direct and 3PL coordination.

### BL.6 Customer Tier & Composite Score (Visible in Customer 360)

**Tier card in Sales Module > Customer 360 > Overview tab:**

| Field | Display |
|-------|---------|
| Current Tier | Badge: Tier 1-5 with name (New/Verified/Established/Preferred/Suspended) |
| Composite Score | 0-100, Geist Mono 20px, color-coded (green >70, yellow 40-70, red <40) |
| Score Breakdown | Order count (X/5 ✓/✗), Cumulative spend (EGP X/500K), Months active (X/3), Payment score (X/80), Bounced cheques (X) |
| Next Tier | "Tier 4 requires: Payment score 80+ (currently 72)" — shows what's blocking progression |
| Tier History | Timeline: "Tier 1 → Tier 2 (Mar 2026) → Tier 3 (Jun 2026)" |

**Payment Score (PAYDEX-modeled, 0-100):**
- Inputs: % invoices paid on time (weight 40%), average days to pay (weight 20%), bounced cheques (weight 20%), payment consistency (weight 20%)
- Displayed as score bar with breakdown. 12-month trend sparkline.

### BL.7 Graduated Credit Hold Escalation

**Visible in Finance > Credit Management > Customer Detail:**

| Days Overdue | Action | UI |
|-------------|--------|-----|
| 1-30 | Automated email + WhatsApp reminder | Yellow "Reminder Sent" tag |
| 31-45 | Second reminder + phone call assigned to AR team | Orange "Follow-Up" tag |
| 46-60 | Order hold applied + tier downgrade warning | Red "Order Hold" badge, banner: "New orders blocked" |
| 61-90 | Credit freeze + Tier 5 (Suspended) + legal notice generated | Red "Suspended" badge, legal notice PDF generated |
| 90+ | Collections escalation + external collection agency option | Dark red "Collections" badge |

**Timeline visible:** Each escalation step shows date, action taken, assigned person, and current status.

### BL.8 Arabic-Primary Legal Documents

**All generated PDFs (invoices, quotes, delivery notes, credit notes, payment receipts) are Arabic-primary:**
- Arabic text: primary language, full content
- English text: secondary translation where applicable (line items, totals)
- Terms & Conditions: Arabic only (legal enforceability in Egyptian courts)
- ETA e-invoicing: Arabic required by Egyptian Tax Authority
- Post-dated cheque notice: "الشيك المرتد يعد جريمة جنائية بموجب القانون المصري" (criminal liability disclaimer)

### BL.9 Withholding Tax & Certificates

**Supplier invoices (AP module):**
- Withholding tax line: 1% withheld on goods, 5% on services (drivers)
- Display: "Gross: EGP 100,000 | Withholding (1%): EGP 1,000 | Net Payable: EGP 99,000"
- `[Generate Withholding Certificate]` button → PDF: supplier name, TRN, gross amount, withholding rate, withholding amount, payment date, certificate number
- Certificate sent to supplier via portal + WhatsApp
- Quarterly: Form 41 remittance report for ETA submission

### BL.10 Ramadan & Cairo Truck Ban Dispatch UI

**Ramadan Mode (toggled in Admin > System Settings):**
- When active: persistent amber banner in Dispatch module: "🌙 Ramadan Mode Active — 6-hour working day, adjusted SLAs"
- Delivery windows automatically shortened from 8h to 6h
- Friday Jumu'ah 11:30 AM - 1:30 PM blackout enforced (grayed out on timeline)
- Prayer time buffers (15 min) highlighted in yellow on route timeline

**Cairo Truck Ban:**
- When dispatcher assigns heavy truck (5+ tons) to Greater Cairo address:
  - Red alert banner: "Cairo Truck Ban: Vehicle exceeds 5 tons. Delivery window locked to 12:00 AM - 6:00 AM."
  - Time window auto-set to nighttime. Cannot be overridden without manager approval.
  - Customer-facing: delivery date shows "Night Delivery: 12AM-6AM" with explanation tooltip.

---

### BL.11-BL.16 Compliance & Operational Rules

---

#### BL.11 Revenue Recognition — EAS 48

**Finance module -- Revenue Recognition view (Internal Platform):**

- Revenue Recognition tab under Finance section
- Filterable by fiscal year, quarter, month, customer, product category
- Columns: Recognition Date, Invoice #, Customer, Gross Revenue, COGS, Delivery Cost, Gross Margin, Margin %, Principal (always "Yes"), QB Synced
- Summary row: totals for gross revenue, COGS, margin
- Red badge on any invoice where `revenue_recognized = false` and delivery status = 'delivered' (orphan detection)
- Export to CSV for accountant handoff
- Revenue recognized **only** on delivery confirmation -- no manual override permitted (read-only field in invoice detail)
- Revenue reversal button on credit notes: creates a negative `revenue_recognition_events` row with `is_reversed = true` linking to the original

---

#### BL.12 E-Signature Law 15/2004

**Driver App -- POD capture screen enhancements:**

- Before signature capture: display legal disclaimer in Arabic/English: "By signing below, you confirm receipt of the listed materials in the condition described. This signature is legally binding under Egyptian Law 15/2004." Checkbox required.
- Signer name field: required (text input, min 3 chars)
- Signer role field: required (dropdown: "Site Engineer", "Foreman", "Warehouse Clerk", "Project Manager", "Owner", "Authorized Representative", "Other")
- Signer phone field: optional but prompted for orders >EGP 100,000
- Signer national ID field: optional, shown only for orders >EGP 500,000 (high-value threshold)
- GPS must be active -- if accuracy >50m, show warning "GPS accuracy is low. Move to an open area." Block capture if accuracy >100m.
- Minimum 1 photo required. Photo shows timestamp + GPS watermark overlay (rendered on-device before upload).
- Signature canvas: minimum 150x80px stroke area. If signature is too small (fewer than 50 touch points), prompt "Please provide a clearer signature."
- All hashes computed on-device before upload (Web Crypto API SHA-256)
- Offline mode: all data stored in PowerSync local SQLite with `offline_captured = true`. Synced when connectivity returns. Banner: "Captured offline -- will sync automatically."

**Internal Platform -- POD verification view (Finance/Legal):**

- POD detail shows: signature image, all photos with GPS map pin, signer info, all hashes, tamper check status
- If `tamper_check_status = 'hash_mismatch'`: red banner "INTEGRITY ALERT: Document hashes do not match. Possible tampering detected."
- "Re-verify" button triggers `/api/pod/verify/{delivery_id}` on demand
- PDF export of full POD evidence package (signature + photos + GPS + hashes + timestamps) for legal proceedings

---

#### BL.13 Carrier Prefix OTP Routing

**Login/Signup OTP screen:**

- After phone number entry, show carrier chip: "Vodafone" / "Etisalat" / "Orange" / "WE" (detected from prefix)
- Primary: "Sending code via WhatsApp..." with WhatsApp icon
- After 30s without verification: "Didn't receive it? Sending via SMS..." (automatic fallback, show SMS icon)
- After 60s total: "Still waiting? We'll call you." (voice fallback link)
- Timer shown: "Code expires in 5:00" countdown
- Monospace input for 6-digit code (Geist Mono per DS.2)

**Admin -- OTP Analytics dashboard (Internal Platform, under Admin):**

- Delivery rate by carrier: bar chart showing WhatsApp vs SMS vs Voice success rates per carrier
- Average latency by carrier and channel
- Table: last 100 OTP attempts with phone (masked), carrier, channel, status, latency
- Alert if any carrier's delivery rate drops below 80%

---

#### BL.14 7-Day Customer Onboarding Sequence

**Internal Platform -- Customer detail, Onboarding tab:**

- Timeline view showing all 5 steps with status icons: scheduled (gray clock), sent (blue arrow), completed (green check), skipped (gray dash), failed (red X)
- Each step shows: step name, scheduled time, actual sent time, channel used
- For phone_call steps: "Mark as Completed" button with notes field (call outcome, next steps)
- "Skip Step" button with required reason
- Progress bar: "3 of 5 steps completed"
- If customer places an order before Day 7, show "Customer converted early!" badge and auto-skip remaining marketing steps

**Internal Platform -- Onboarding Dashboard (Sales Manager view):**

- Table: all customers currently in onboarding, current step, days since signup, sales rep assigned
- Filter by: step status, sales rep, date range
- Metric cards: "In Onboarding" count, "Converted <7 days" count, "Stalled" count (no activity after Day 3)
- Red highlight on customers where a phone_call step is overdue by >24h

---

#### BL.15 Khamsin Weather Enforcement

**Internal Platform -- Dispatch module:**

- Weather banner at top of dispatch screen when any active delivery zone has `severity != 'normal'`:
  - Advisory (yellow): "Wind Advisory: {governorate} -- {wind_speed} km/h winds forecast. Sheet material deliveries may be affected."
  - Warning (orange): "Khamsin Warning: {governorate} -- {wind_speed} km/h winds. Sheet material deliveries BLOCKED."
  - Severe (red): "SEVERE STORM: {governorate} -- All outdoor operations paused. {wind_speed} km/h winds, {visibility} km visibility."
- When scheduling a delivery containing wind-sensitive items on a blocked day:
  - Hard block: cannot confirm schedule. Red inline error: "Cannot schedule -- plywood, drywall, and roofing sheets cannot be delivered in winds >30 km/h. Next safe date: {date}."
  - Suggest split: "Split delivery? Non-sheet items can ship today. Sheet items rescheduled to {next_safe_date}."
- Weather widget in dispatch sidebar: 3-day forecast per governorate, wind speed in monospace (Geist Mono), color-coded per severity
- Delivery calendar: blocked dates show red diagonal stripe pattern for wind-sensitive product categories

**Driver App:**

- Weather alert banner on daily route screen when relevant: "Khamsin Warning: Secure all loads. Sheet materials may be rescheduled."
- If a delivery is rescheduled due to weather, driver sees: "Delivery #{number} rescheduled to {new_date} -- wind safety hold"

**Customer Portal:**

- Order tracking: if delivery delayed due to weather, show: "Delivery delayed due to weather safety -- rescheduled to {new_date}. Your materials will arrive safely."

---

#### BL.16 LIFO Prohibition Enforcement

**Internal Platform -- Admin Settings, Inventory Configuration:**

- Costing method dropdown: only two options -- "Weighted Average Cost (WAC)" and "FIFO (First-In, First-Out)"
- No LIFO option exists in the dropdown. Not hidden -- simply never rendered.
- Below the dropdown, informational text: "Egyptian Accounting Standards require WAC or FIFO. LIFO is not permitted."
- If tenant uses WAC (default): show real-time WAC per product on inventory detail screens
- If tenant uses FIFO: show lot-level cost breakdown sorted by receipt date (oldest first)

**Inventory detail screen:**

- Cost column header shows "(WAC)" or "(FIFO)" suffix based on tenant setting
- Tooltip on cost column: "Weighted Average Cost -- calculated automatically on each receipt per Egyptian Accounting Standards"
- Stock movements table shows `unit_cost` at time of each movement -- immutable, never retroactively recalculated


### BL.17 Drop-Ship POD Flow (WhatsApp-Based)

**Phase 1 (launch): 80%+ of deliveries are drop-ship. Supplier's driver delivers, not HyperQuote's.**

**Flow:**
1. Supplier's driver delivers materials with HyperQuote-branded delivery note
2. Supplier's driver photographs the signed delivery note → sends via WhatsApp to HyperQuote's designated number
3. System receives photo → matches to delivery by reference number or supplier phone
4. Customer receives WhatsApp prompt: "Your delivery for Order #X has arrived. [Confirm] [Report Issue]"
5. Invoice triggers on FIRST confirmation (supplier photo OR customer confirmation)
6. Auto-confirm at 72 hours if no dispute

**Portal (Customer View):**
- Delivery tracking shows "Awaiting your confirmation" status with `[Confirm Delivery]` `[Report Issue]` buttons
- Confirm → "Thank you! Invoice will be generated shortly."
- Report Issue → dispute form (reason + description + photos)

**Internal (Dispatch):**
- Drop-ship deliveries show in POD review with supplier-submitted photos
- Status: "Supplier POD Received — Awaiting Customer" or "Customer Confirmed" or "Disputed"
- Dispatch can manually confirm if customer unresponsive after 48h

### BL.18 Proforma Invoice Auto-Generation

**On quote acceptance, system IMMEDIATELY generates a proforma invoice (before order processing).**

- Proforma is NOT a tax document (no ETA submission)
- Contains: all line items from accepted quote, bank details for wire transfer, payment reference number
- Auto-sent to customer via WhatsApp + portal
- Portal shows: "Proforma invoice sent to your WhatsApp. Use reference QR-2026-XXXXX when making payment."
- Finance sees proforma in invoice list with "Proforma" type badge
- Customer uses proforma to arrange payment instrument (wire transfer, cheque, LC)

### BL.19 Tier-Based Payment Instrument Bypass (Updated BL.1)

| Customer Tier | Required Before Order Processing | Auto-Bypass? |
|--------------|----------------------------------|-------------|
| Tier 1 (New) | 100% advance wire (confirmed receipt) | No |
| Tier 2 (Verified) | 50% advance wire + 50% post-dated cheques | No |
| Tier 3 (Established) | Post-dated cheques OR LC covering full amount | No |
| Tier 4 (Preferred) | **None required upfront** | **YES** — Net 30, payment due after delivery |
| Tier 5 (Suspended) | Cash before delivery (confirmed receipt) | No |

Portal behavior for Tier 4: after accepting quote, NO "provide payment instrument" screen. Instead: "Order confirmed. Payment due Net 30 from delivery date."

### BL.20 Multi-Currency Rate Lock

- Customer-facing prices: exchange rate locked at **quote creation** (stored on quote record)
- Supplier costs: exchange rate locked at **PO creation** (stored on PO record)
- Invoice uses the rate from the original quote — customer pays what was quoted, regardless of rate changes
- If rate moves >5% between quote and PO, system flags for procurement review before PO is sent
- All amounts displayed in EGP with original currency noted: "EGP 450,000 (based on USD 1 = EGP 50.2, locked Mar 15)"

### BL.21 PO Anonymization (Two-Document Model)

| Document | Recipient | Shows Customer Name? | Shows Real Address? |
|----------|-----------|---------------------|-------------------|
| **Purchase Order** | Supplier | NO — HyperQuote is the buyer | NO — coded reference (HQ-2026-XXXX) |
| **Delivery Note** | Supplier (sent separately on PO confirmation) | NO — site contact first name only | YES — full address + access instructions |

This prevents supplier from identifying and directly contacting the end customer (channel conflict protection).

### BL.22 Invoice Dispute Resolution Workflow

**When customer clicks [Dispute] on an invoice:**

1. **Raise:** Customer selects reason (incorrect amount / damaged goods / wrong items / missing items / duplicate / pricing disagreement / other) + description + evidence photos
2. **Assign:** System auto-assigns to finance team. 48-hour SLA starts.
3. **Investigate:** Finance reviews evidence, contacts relevant parties (warehouse for damage, sales for pricing).
4. **Resolve:** Four outcomes: `[Adjust Amount]` `[Issue Credit Note]` `[Maintain Invoice]` `[Partially Adjust]`
5. **Notify:** Customer notified of resolution via WhatsApp + portal.

**Finance Module:** Disputes appear in a dedicated queue with SLA countdown. Overdue disputes (>48h) auto-escalate to Finance Manager.

**Portal:** Customer sees dispute status: "Under Investigation" → "Resolved — [outcome]"

### BL.23 Notification Consolidation

**Cascading events generate ONE summary notification, not 5+ individual ones.**

| Root Event | Individual Actions | Summary Notification |
|-----------|-------------------|---------------------|
| Cheque bounced | Credit hold + Tier 5 + legal notice + sales alert + invoice revert | "Cheque #4521 from ACME Corp bounced. Actions: credit hold, Tier 5, legal notice." |
| Credit limit exceeded | Order hold + sales alert + credit manager alert | "ACME Corp credit limit exceeded by EGP 50K. New orders held." |
| Delivery failed | Dispatch alert + customer notification + reschedule needed | "Delivery #D-2026-0847 failed: site not ready. Rescheduling required." |

Notification bell shows summary count only. Expand to see individual actions within each group.

### BL.24 Batch Operations

**Available in Internal Platform for high-volume processing:**

| Operation | Module | Trigger | What It Does |
|-----------|--------|---------|-------------|
| Batch Receive | Warehouse | `Ctrl+Shift+R` or "Batch Receive" button | Select multiple POs → process all in one session |
| Batch Send Invoices | Finance | Select invoices → "Send All" | Send multiple invoices via selected channels |
| Batch Deposit Cheques | Finance | Select cheques → "Deposit All" | Mark multiple cheques as deposited |
| Batch Payment Import | Finance | Upload bank CSV | Auto-match and apply multiple payments |

All batch operations are atomic — all succeed or all fail (except batch invoice generation, which soft-fails invalid items).

### BL.25 AI Fallback Chain

**When primary AI provider is unavailable:**

| Use Case | Primary | Fallback 1 | Fallback 2 | Timeout |
|----------|---------|------------|------------|---------|
| Portal chat | Claude Sonnet | Groq Qwen3 32B | GLM-4 Flash | 5s |
| CEO analytics | Claude Sonnet | Groq Qwen3 32B | — | 8s |
| Intent classification | GLM-4 Flash | Groq Qwen3 32B | — | 2s |
| OCR (catalogs) | Mistral OCR | Claude Vision | — | 15s |

**If all providers fail:** Chat shows glass info banner: "AI is temporarily unavailable. You can still browse products, check orders, and submit requests." + action buttons. Auto-retry after 30 seconds.


---

*This document is the complete frontend specification for all 5 HyperQuote applications. All screens, interactions, validation rules, offline behaviors, mobile-specific considerations, state machines, cross-app flows, and business logic enforcement are documented per the research, walkthroughs, UI vision, and UX research patterns.*

*Created: 2026-03-29. Sources: RESEARCH.md (87 agents), UI-VISION.md, STACK-DECISION.md, RESEARCH-B2B-Portal-UX-Patterns.md, RESEARCH-UX-Patterns-Dispatch-Fleet-Warehouse.md, RESEARCH-Finance-Sales-UX-Patterns.md, RESEARCH-Order-Quote-State-Machine.md, WALKTHROUGH-CEO-Perspective.md, WALKTHROUGH-Driver-Perspective.md, RESEARCH-Complete-Driver-Operations-Model.md.*
