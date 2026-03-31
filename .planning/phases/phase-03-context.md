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

Derived tokens: `--color-text-muted` (70% opacity), `--color-text-subtle` (50% opacity), `--color-border` (15% opacity), `--color-surface`, `--color-base-alt`, `--color-card`.

Semantic status colors (data only): green (success), yellow/amber (warning), red (error), blue-gray (info).

Dark mode: `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))` -- not Tailwind `dark:` prefix.

**CRITICAL:** Colors in `:root {}`, NEVER in `@theme`. `--color-base` in `@theme` makes `text-base` set color instead of font-size.

### DS.2 Typography
| Font | Usage |
|------|-------|
| Inter | All Latin text |
| IBM Plex Sans Arabic | All Arabic text. Weights 100-700 only. |
| Geist Mono | ALL numeric data -- prices, quantities, IDs, dates, timestamps |

14px base for all apps. 16px for website body text.

### DS.5 Motion
| Type | When | Engine |
|------|------|--------|
| Spring | Entering | Motion v12 |
| Tween | Exiting | Motion v12 |
| CSS transition | Popovers, menus, hover states | Native CSS |

Three speeds: Fast (100-150ms), Medium (200-300ms), Slow (400-600ms). Colors change instantly -- never animate color transitions.

### DS.6 Glass Window System
**Window tier:** backdrop-blur-xl, rgba(255,255,255,0.80) / dark: rgba(0,0,0,0.80), subtle shadow, spring on open, tween on close. Desktop: ~90% viewport. Mobile: 100%.

**Elevated tier:** backdrop-blur-2xl, rgba(255,255,255,0.90) / dark: rgba(0,0,0,0.90), deeper shadow, floats above window tier.

### DS.7 Loading, Empty, Error States
- Loading: Skeleton shimmer loaders. No spinners. No "Loading..." text.
- Empty: Meaningful message + contextual CTA button.
- Error: inline error + retry button. Toast for async feedback. Offline banner at top.

### DS.9 i18n & RTL
**Arabic-Indic numerals:** When locale is Arabic, ALL displayed numbers convert. Use `Intl.NumberFormat('ar-EG')`.

**Currency:** EN: `"EGP 56,400"` (prefix). AR: `"٥٦٬٤٠٠ ج.م"` (suffix, Arabic-Indic).

**Unit translations:**
| Enum | EN | AR |
|------|----|----|
| kg | kg | كجم |
| ton | ton | طن |
| meter | m | م |
| sqm | m² | م² |
| piece | pc | قطعة |
| bag | bag | كيس |
| bundle | bundle | حزمة |
(Full table of 28 units in FRONTEND.md DS.9)

Implementation: `<UnitDisplay value={quantity} unit={unitEnum} />` renders both number and unit in correct locale.

### DS.10 Data Grids & Tables
TanStack Table + React Aria. Click to edit inline. Tab advances. Arrow keys navigate. Sort by column headers. Row selection via checkbox. Bulk actions toolbar. Numeric columns right-aligned in Geist Mono.

### DS.11 Status Color System
| Status | Color |
|--------|-------|
| Moving/Active | Green |
| Idle/Pending/Aging | Yellow/Amber |
| Stopped/Overdue/Error | Red |
| Assigned/In Progress | Blue |
| Unassigned/Offline | Gray |

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
