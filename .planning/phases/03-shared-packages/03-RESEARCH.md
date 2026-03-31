# Phase 3: Shared Packages - Research

**Researched:** 2026-03-31
**Domain:** React component library, i18n, form/table abstractions, design tokens, TypeScript types
**Confidence:** HIGH

## Summary

Phase 3 populates 6 shared packages (types, ui, i18n, auth enhancement, forms, tables) that are currently empty stubs from Phase 1. The packages already exist in `packages/` with `package.json` and empty `src/index.ts` files. The `@hyperquote/auth` package is the only one with real code (server/client Supabase factories from Phase 1 validation).

The core challenge is building a cohesive component library that enforces the spatial glass design system, Arabic-Indic numeral formatting, RTL logical properties, and three-color constraint -- then proving it works end-to-end with a vertical slice page that fetches data via server function, enforces RLS, renders React Aria components in RTL Arabic, and toggles dark mode.

**Primary recommendation:** Build packages bottom-up (types -> i18n -> ui -> auth -> forms -> tables) then create the vertical slice page in the website app to prove the full stack.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- GlassWindow component renders with spring-enter/tween-exit animation in both light and dark mode
- Arabic-Indic numerals display correctly via CurrencyDisplay, DateDisplay, and UnitDisplay when locale is AR
- i18next (^25.10.10) loads AR+EN namespaces with type-safe keys and switches locale without page reload
- A vertical slice page fetches data through a server function, enforces RLS, renders with React Aria in RTL Arabic, and toggles dark mode
- Tailwind v4 tokens.css with colors in `:root {}` renders correctly, RTL logical properties (ps-/pe-/ms-/me-) work
- All 7 shared packages build and export correct APIs

### Claude's Discretion
- Internal package structure (file organization within each package)
- Which components to build first vs. stub
- Vertical slice page design and data model
- Test approach for the phase

### Deferred Ideas (OUT OF SCOPE)
- CommandPalette full implementation (build the shell, not the search logic)
- OfflineBanner (stub only -- needs service worker infrastructure)
- Full table features (sort, filter, select, bulk actions -- build the base wrapper)

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-05 | Shared packages build: @hyperquote/ui, @hyperquote/types, @hyperquote/i18n, @hyperquote/auth, @hyperquote/forms, @hyperquote/tables | All package structures, deps, and export maps documented below |
| FOUND-06 | Tailwind v4 with tokens.css renders correctly, colors in `:root {}`, RTL logical properties | tokens.css already exists at `essential/brand/tokens.css`, dark mode variant pattern documented |
| FOUND-07 | React Aria Components render with correct RTL support and Arabic-Indic numerals | React Aria I18nProvider pattern, locale passing, SSR hydration bug workaround documented |
| FOUND-08 | i18next configured with AR+EN namespaces, type-safe keys, Arabic-Indic number formatting | i18next + react-i18next config, resources.d.ts type-safety pattern, Intl.NumberFormat usage documented |

</phase_requirements>

## Standard Stack

### Core (packages to populate)

| Package | Key Dependencies | Version | Purpose |
|---------|-----------------|---------|---------|
| `@hyperquote/types` | (none) | — | TypeScript enums + entity interfaces from BACKEND.md Section 13 |
| `@hyperquote/ui` | react-aria-components, motion, lucide-react, tailwindcss | 1.16.0, 12.38.0, 1.7.0, 4.2.2 | GlassWindow, StatusBadge, Skeleton, Toast, display components |
| `@hyperquote/i18n` | i18next, react-i18next | 25.10.10, 17.0.0 | AR+EN namespaces, type-safe keys, number/unit/currency formatting |
| `@hyperquote/auth` | @supabase/ssr, @supabase/supabase-js | 0.9.0, 2.100.1 | Already built -- enhance with `beforeLoad` guard and session helpers |
| `@hyperquote/forms` | react-hook-form, @hookform/resolvers, zod, react-aria-components | 7.72.0, 5.2.2, 3.24.0, 1.16.0 | RHF + Zod + React Aria field wrappers |
| `@hyperquote/tables` | @tanstack/react-table, react-aria-components | 8.21.3, 1.16.0 | TanStack Table + React Aria table component |

### Supporting (new deps to add)

| Library | Version (npm verified 2026-03-31) | Purpose | Install To |
|---------|-----------------------------------|---------|------------|
| react-aria-components | 1.16.0 | Accessible UI primitives | @hyperquote/ui, @hyperquote/forms, @hyperquote/tables |
| motion | 12.38.0 | Spring/tween animations | @hyperquote/ui |
| lucide-react | 1.7.0 | Icons | @hyperquote/ui |
| i18next | 25.10.10 | i18n core | @hyperquote/i18n |
| react-i18next | 17.0.0 | React bindings for i18next | @hyperquote/i18n |
| react-hook-form | 7.72.0 | Form state | @hyperquote/forms |
| @hookform/resolvers | 5.2.2 | Schema resolvers (standardSchemaResolver) | @hyperquote/forms |
| zod | ^3.24.0 | Validation schemas | @hyperquote/forms, @hyperquote/types |
| @tanstack/react-table | 8.21.3 | Headless table | @hyperquote/tables |
| tailwindcss-react-aria-components | 2.0.1 | TW plugin for React Aria states | @hyperquote/ui (peer) |
| tailwind-merge | 3.5.0 | Class merging utility | @hyperquote/ui |
| clsx | 2.1.1 | Conditional classes | @hyperquote/ui |

### Version Notes

| Package | STACK-DECISION.md Version | npm Latest | Action |
|---------|--------------------------|------------|--------|
| i18next | ^25.10.10 | 26.0.3 | **Use ^25.10.10 per FOUND-08 requirement.** STATE.md notes roadmap planned 26.x update, but FOUND-08 locks to 25.x for this phase. Breaking change in v26: `interpolation.format` API removed. |
| zod | ^3.24.0 | 4.3.6 | Stay on ^3.24.0 (3.25.76). Zod 4 is new major, not yet adopted by ecosystem. |
| react-i18next | ^17.0.0 | 17.0.2 | Use ^17.0.0. |

## Architecture Patterns

### Package Structure

```
packages/
  types/
    src/
      index.ts          # re-exports
      enums.ts           # all union types from BACKEND.md 13.1
      entities.ts        # all interfaces from BACKEND.md 13.2
      helpers.ts         # ISODate, ISODateTime, BaseEntity, TenantEntity
    package.json
  ui/
    src/
      index.ts           # re-exports all components
      glass/
        GlassWindow.tsx
        GlassElevated.tsx
      display/
        CurrencyDisplay.tsx
        DateDisplay.tsx
        UnitDisplay.tsx
      feedback/
        StatusBadge.tsx
        Skeleton.tsx
        Toast.tsx
        EmptyState.tsx
        OfflineBanner.tsx   # stub
      brand/
        LionMark.tsx
      command/
        CommandPalette.tsx  # shell only
      utils/
        cn.ts              # clsx + tailwind-merge
    package.json
  i18n/
    src/
      index.ts           # init function + re-exports
      config.ts          # i18next init config
      locales/
        en/
          common.json
          units.json
        ar/
          common.json
          units.json
      types/
        resources.d.ts   # type-safe keys
      formatters/
        number.ts        # Arabic-Indic number formatting
        currency.ts      # EGP formatting
        date.ts          # locale-aware dates
        unit.ts          # unit translations
    package.json
  auth/                  # already has code -- enhance
    src/
      index.ts
      server.ts          # existing
      client.ts          # existing
      guard.ts           # NEW: beforeLoad auth guard
      session.ts         # NEW: session helpers
      types.ts           # NEW: auth-related types
    package.json
  forms/
    src/
      index.ts
      resolver.ts        # standardSchemaResolver wrapper
      fields/
        TextField.tsx     # React Aria TextField + RHF Controller
        NumberField.tsx
        SelectField.tsx
        DateField.tsx
        CheckboxField.tsx
      FormRoot.tsx        # form wrapper with RHF provider
    package.json
  tables/
    src/
      index.ts
      DataTable.tsx      # TanStack Table + React Aria Table
      columns.ts         # column helper utilities
    package.json
```

### Pattern 1: Glass Window Component

**What:** Spatial glass panel with spring-enter / tween-exit animations, backdrop blur, two tiers (window / elevated).

**When to use:** Every app surface that floats over the canvas.

```tsx
// @hyperquote/ui/src/glass/GlassWindow.tsx
import { motion, AnimatePresence } from 'motion/react'
import type { ReactNode } from 'react'

interface GlassWindowProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  tier?: 'window' | 'elevated'
}

export function GlassWindow({ isOpen, onClose, children, tier = 'window' }: GlassWindowProps) {
  const isElevated = tier === 'elevated'
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          // Spring enter
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          // Tween exit
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{
            // AnimatePresence uses exit transition for exit
            type: 'spring',
            stiffness: 200,
            damping: 20,
          }}
          // Exit uses tween
          // Motion handles this via separate exit transition
          className={`
            fixed inset-0 flex items-center justify-center
            ${isElevated ? 'z-50' : 'z-40'}
          `}
        >
          <div
            className={`
              ${isElevated
                ? 'backdrop-blur-2xl bg-[rgba(255,255,255,0.90)] dark:bg-[rgba(0,0,0,0.90)] shadow-lg'
                : 'backdrop-blur-xl bg-[rgba(255,255,255,0.80)] dark:bg-[rgba(0,0,0,0.80)] shadow-md'
              }
              rounded-xl w-[90vw] h-[90vh] max-md:w-full max-md:h-full
              overflow-auto
            `}
          >
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

**Critical:** The exit transition must be tween, not spring. Use `exit` prop with `transition: { duration: 0.2, ease: 'easeIn' }`.

### Pattern 2: i18next Type-Safe Configuration

**What:** Type-safe i18n keys via `resources.d.ts` module augmentation.

```typescript
// @hyperquote/i18n/src/types/resources.d.ts
import type en from '../locales/en/common.json'
import type enUnits from '../locales/en/units.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof en
      units: typeof enUnits
    }
  }
}
```

```typescript
// @hyperquote/i18n/src/config.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en/common.json'
import enUnits from './locales/en/units.json'
import ar from './locales/ar/common.json'
import arUnits from './locales/ar/units.json'

export function initI18n(locale: 'ar' | 'en' = 'ar') {
  return i18n
    .use(initReactI18next)
    .init({
      lng: locale,
      fallbackLng: 'en',
      defaultNS: 'common',
      ns: ['common', 'units'],
      resources: {
        en: { common: en, units: enUnits },
        ar: { common: ar, units: arUnits },
      },
      interpolation: {
        escapeValue: false, // React already escapes
      },
    })
}
```

### Pattern 3: Arabic-Indic Number Formatting

**What:** All numbers convert to Arabic-Indic numerals when locale is Arabic.

```typescript
// @hyperquote/i18n/src/formatters/number.ts
const arFormatter = new Intl.NumberFormat('ar-EG')
const enFormatter = new Intl.NumberFormat('en-US')

export function formatNumber(value: number, locale: 'ar' | 'en'): string {
  return locale === 'ar' ? arFormatter.format(value) : enFormatter.format(value)
}

// Currency
const arCurrencyFormatter = new Intl.NumberFormat('ar-EG', {
  style: 'currency',
  currency: 'EGP',
})
const enCurrencyFormatter = new Intl.NumberFormat('en-EG', {
  style: 'currency',
  currency: 'EGP',
})

export function formatCurrency(value: number, locale: 'ar' | 'en'): string {
  return locale === 'ar'
    ? arCurrencyFormatter.format(value)
    : enCurrencyFormatter.format(value)
}
```

### Pattern 4: React Aria I18nProvider (SSR-Safe)

**What:** Pass locale explicitly to avoid hydration bug #7474.

```tsx
// In __root.tsx or layout component
import { I18nProvider } from 'react-aria-components'

// CRITICAL: Pass locale explicitly, never let it auto-detect
<I18nProvider locale={currentLocale}>
  {children}
</I18nProvider>
```

### Pattern 5: React Hook Form + React Aria Field

**What:** Wrap React Aria fields with RHF Controller for form integration.

```tsx
// @hyperquote/forms/src/fields/TextField.tsx
import { Controller, useFormContext } from 'react-hook-form'
import { TextField as AriaTextField, Label, Input, FieldError } from 'react-aria-components'

interface TextFieldProps {
  name: string
  label: string
  type?: 'text' | 'email' | 'tel'
  isRequired?: boolean
}

export function TextField({ name, label, type = 'text', isRequired }: TextFieldProps) {
  const { control } = useFormContext()
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <AriaTextField
          value={field.value ?? ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          isInvalid={!!fieldState.error}
          isRequired={isRequired}
          type={type}
        >
          <Label>{label}</Label>
          <Input className="..." />
          {fieldState.error && (
            <FieldError>{fieldState.error.message}</FieldError>
          )}
        </AriaTextField>
      )}
    />
  )
}
```

### Pattern 6: Dark Mode via data-theme Attribute

**What:** Dark mode toggle using `data-theme` attribute on `<html>`, not Tailwind `dark:` prefix.

```typescript
// Tailwind v4 custom variant (in app's CSS)
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

```tsx
// Theme toggle (Zustand store or simple state)
function toggleTheme() {
  const html = document.documentElement
  const current = html.getAttribute('data-theme')
  html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark')
}

// SSR: detect system preference on server, set attribute during render
// to avoid flash. Read from cookie if user has set preference.
```

### Pattern 7: Tailwind v4 CSS Setup for Shared Packages

**What:** Each app imports tokens.css and font-face.css. Shared packages do NOT import CSS -- they use CSS classes and custom properties that the consuming app provides.

```css
/* apps/website/src/styles.css */
@import "tailwindcss";
@import "../../../essential/brand/tokens.css";
@import "../../../essential/brand/fonts/font-face.css";

@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
@plugin 'tailwindcss-react-aria-components';
```

**Critical:** Shared packages like `@hyperquote/ui` must NOT bundle their own CSS. They reference CSS variables (`var(--color-primary)`) and Tailwind classes. The consuming app is responsible for importing tokens.css and tailwindcss.

### Anti-Patterns to Avoid

- **Colors in `@theme`:** NEVER put `--color-*` tokens in `@theme` block. `--color-base` in `@theme` makes `text-base` set color instead of font-size. Always use `:root {}`.
- **`watch()` from React Hook Form:** ALWAYS use `useWatch()`. `watch()` is broken with React 19 / React Compiler.
- **`zodResolver`:** Use `standardSchemaResolver` from `@hookform/resolvers/standard-schema`. It works with any Standard Schema compliant library (Zod, Valibot, etc.).
- **Auto-detecting locale in I18nProvider:** Pass locale explicitly. Auto-detection via `useDefaultLocale()` causes SSR hydration blank flash (#7474).
- **`@import` for TW plugins:** Use `@plugin 'tailwindcss-react-aria-components'`, NOT `@import`.
- **`dark:` prefix:** Use `@custom-variant dark (...)` with `data-theme` attribute.
- **`group-selected:`:** Use `group-data-[selected]:` instead (broken in TW v4, #15401).
- **Importing `motion` from `framer-motion`:** Import from `motion/react`.
- **Motion for Popover/Menu:** Use CSS transitions. Motion causes race condition (#9158). Motion is for Modal/Dialog only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Number formatting (Arabic-Indic) | Custom digit replacement | `Intl.NumberFormat('ar-EG')` | Handles grouping separators (momayyez), decimal marks, all numeral systems correctly |
| Currency formatting | String concatenation | `Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' })` | Handles suffix/prefix, symbol localization, separator differences |
| Date formatting | Manual date string building | `Intl.DateTimeFormat` with locale | Handles Arabic month/day names, Arabic-Indic day numbers, calendar systems |
| Relative time | "X ago" string templates | `Intl.RelativeTimeFormat` | Arabic has dual form (2 items), and 6 plural rules |
| CSS class merging | Manual string concat | `clsx` + `tailwind-merge` | Resolves conflicting Tailwind classes correctly |
| Form validation integration | Manual error state | `react-hook-form` Controller + React Aria | Handles focus management, error announcements, validation timing |
| Accessible UI primitives | Custom div-based components | `react-aria-components` | Keyboard navigation, screen readers, ARIA attributes, RTL support |
| Table state (sort/filter/page) | Custom state management | `@tanstack/react-table` | Handles column ordering, multi-sort, nested grouping, virtual scrolling |

**Key insight:** Arabic number/date/currency formatting is deceptively complex -- 6 plural forms, right-to-left digit ordering, momayyez (comma-like) separator, suffix currency symbol. `Intl` APIs handle all of this correctly and are available in Workers.

## Common Pitfalls

### Pitfall 1: Tailwind v4 @theme Color Collision
**What goes wrong:** Defining `--color-base` in `@theme` makes `text-base` set a color value instead of `font-size: 1rem`.
**Why it happens:** Tailwind v4 auto-generates utilities from `@theme` tokens. `--color-*` creates `text-{name}`, `bg-{name}` etc.
**How to avoid:** All color tokens go in `:root {}` block, never in `@theme`. Use `text-[var(--color-text)]` for color utilities.
**Warning signs:** `text-base` not setting font size, or unexpected color values in elements.

### Pitfall 2: React Aria I18nProvider SSR Hydration Bug
**What goes wrong:** Blank page flash on SSR hydration when I18nProvider auto-detects locale.
**Why it happens:** Server renders with one locale, client hydrates with browser-detected locale. Mismatch causes blank flash. GitHub issue #7474.
**How to avoid:** Always pass `locale` prop explicitly to `<I18nProvider locale={locale}>`.
**Warning signs:** Flash of blank content on page load, console hydration warnings.

### Pitfall 3: Motion Popover/Menu Race Condition
**What goes wrong:** Popover/Menu components flicker or fail to close properly when animated with Motion.
**Why it happens:** AnimatePresence exit animation races with React Aria's focus management. GitHub issue #9158.
**How to avoid:** Use CSS transitions for Popover and Menu. Use Motion AnimatePresence only for Modal/Dialog/GlassWindow.
**Warning signs:** Popovers that stay visible, menus that fail to close, focus traps that don't release.

### Pitfall 4: react-i18next `<Trans>` Component in RTL
**What goes wrong:** Text ordering breaks when using `<Trans>` component with interpolated components in Arabic.
**Why it happens:** `<Trans>` renders components in source order, but Arabic text flows right-to-left with mixed LTR embedded elements.
**How to avoid:** Use the `t()` function, NOT `<Trans>` component, for Arabic locale strings.
**Warning signs:** Numbers or embedded elements appearing in wrong position within Arabic text.

### Pitfall 5: Package CSS Bundling
**What goes wrong:** Shared package tries to import/bundle its own CSS, causing duplicate or missing styles.
**Why it happens:** UI packages sometimes try to import tailwindcss or tokens.css directly.
**How to avoid:** Shared packages use only CSS class names and `var(--token)` references. The consuming app imports all CSS.
**Warning signs:** Missing styles in one app but working in another, duplicate CSS in bundle.

### Pitfall 6: Zustand SSR Hydration Mismatch
**What goes wrong:** Server-rendered HTML doesn't match client state, causing React hydration errors.
**Why it happens:** Zustand stores initialize with default state on server, but client may have persisted state.
**How to avoid:** Use `skipHydration: true` in store creation, call `rehydrate()` in `useEffect`.
**Warning signs:** React hydration mismatch warnings in console, flickering on initial load.

### Pitfall 7: i18next v25 vs v26 Breaking Change
**What goes wrong:** Custom formatters break if accidentally installing v26.
**Why it happens:** v26 removed `interpolation.format` API, replaced with `i18n.services.formatter.add()`.
**How to avoid:** Pin to `^25.10.10` as specified in FOUND-08. Do not upgrade to 26.x in this phase.
**Warning signs:** `interpolation.format is not a function` error.

## Code Examples

### CurrencyDisplay Component

```tsx
// @hyperquote/ui/src/display/CurrencyDisplay.tsx
import { useTranslation } from 'react-i18next'

interface CurrencyDisplayProps {
  value: number
  currency?: string
}

const formatters = {
  ar: new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }),
  en: new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }),
}

export function CurrencyDisplay({ value, currency = 'EGP' }: CurrencyDisplayProps) {
  const { i18n } = useTranslation()
  const locale = i18n.language === 'ar' ? 'ar' : 'en'
  const formatted = formatters[locale].format(value)

  return <span className="font-mono">{formatted}</span>
}
```

### UnitDisplay Component

```tsx
// @hyperquote/ui/src/display/UnitDisplay.tsx
import { useTranslation } from 'react-i18next'

interface UnitDisplayProps {
  value: number
  unit: string // UnitOfMeasure enum
}

export function UnitDisplay({ value, unit }: UnitDisplayProps) {
  const { t, i18n } = useTranslation('units')
  const locale = i18n.language === 'ar' ? 'ar' : 'en'
  const formatter = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US')
  const formattedValue = formatter.format(value)
  const unitLabel = t(unit) // looks up unit key in units namespace

  return (
    <span>
      <span className="font-mono">{formattedValue}</span>
      {' '}
      <span>{unitLabel}</span>
    </span>
  )
}
```

### StatusBadge Component

```tsx
// @hyperquote/ui/src/feedback/StatusBadge.tsx
const statusColors = {
  success: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
  error: 'bg-[var(--color-error-bg)] text-[var(--color-error)]',
  info: 'bg-[var(--color-info-bg)] text-[var(--color-info)]',
  neutral: 'bg-[var(--color-surface)] text-[var(--color-text-muted)]',
} as const

interface StatusBadgeProps {
  status: keyof typeof statusColors
  children: React.ReactNode
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  return (
    <span className={`
      inline-flex items-center rounded-full px-2 py-0.5
      text-[var(--text-xs)] font-medium
      ${statusColors[status]}
    `}>
      {children}
    </span>
  )
}
```

### beforeLoad Auth Guard

```tsx
// @hyperquote/auth/src/guard.ts
import { redirect } from '@tanstack/react-router'
import { createSupabaseServerClient } from './server'
import { getRequest } from '@tanstack/react-start/server'

interface AuthGuardOptions {
  supabaseUrl: string
  supabaseAnonKey: string
  loginPath?: string
  requiredPool?: 'internal' | 'external'
}

export async function authGuard(opts: AuthGuardOptions) {
  const request = getRequest()
  const { client } = createSupabaseServerClient({
    request,
    supabaseUrl: opts.supabaseUrl,
    supabaseAnonKey: opts.supabaseAnonKey,
  })
  const { data: { session } } = await client.auth.getSession()

  if (!session) {
    throw redirect({ to: opts.loginPath ?? '/login' })
  }

  return { session, user: session.user }
}
```

### cn Utility

```typescript
// @hyperquote/ui/src/utils/cn.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Skeleton Component

```tsx
// @hyperquote/ui/src/feedback/Skeleton.tsx
import { cn } from '../utils/cn'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-[var(--color-surface)]',
        className,
      )}
    />
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@tanstack/start` | `@tanstack/react-start` | v1.121.0 | Old package frozen at 1.120.20 |
| `vinxi` build system | Pure Vite 7 | v1.121.0 | Use `vite dev` / `vite build` directly |
| `zodResolver` | `standardSchemaResolver` | @hookform/resolvers 5.x | Works with any Standard Schema lib |
| `framer-motion` | `motion` (import from `motion/react`) | Motion v11+ | Package renamed |
| Tailwind `dark:` prefix | `@custom-variant dark (...)` with data-theme | Tailwind v4 | Custom dark mode strategy |
| `tailwind.config.js` | CSS-first `@theme` directive | Tailwind v4 | No config file needed |
| i18next `interpolation.format` | `i18n.services.formatter.add()` | i18next v26 | We stay on v25 for now |

## Open Questions

1. **i18next version: 25 vs 26**
   - What we know: FOUND-08 specifies ^25.10.10. STATE.md says roadmap planned 26.x update. CLAUDE.md says ^26.0.1.
   - What's unclear: Whether to bump to 26 now or stay on 25.
   - Recommendation: Stay on ^25.10.10 per FOUND-08 requirement. Bump to 26 in a dedicated task later. The breaking change (interpolation.format removal) is manageable but not worth risking in this already-large phase.

2. **Package peer dependencies vs direct dependencies**
   - What we know: React, react-dom, tailwindcss are used by all packages.
   - Recommendation: Use `peerDependencies` for react and react-dom. Use `dependencies` for everything specific to the package. Each package declares its own direct deps (don't rely on hoisting).

3. **Display components: i18n dependency**
   - What we know: CurrencyDisplay, DateDisplay, UnitDisplay need `useTranslation()` hook.
   - Recommendation: `@hyperquote/ui` depends on `@hyperquote/i18n`. Display components import formatting utilities from i18n package. The `react-i18next` hook gives access to current locale.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Package manager, scripts | Verify at runtime | 1.3.11+ | -- |
| Node.js | Vite dev server | Verify at runtime | 20+ | -- |
| Vitest | Tests | Not installed | -- | Install as devDep |

No external services or databases required for this phase (vertical slice uses mock data or existing Supabase from Phase 2).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | None -- needs Wave 0 setup |
| Quick run command | `bun run vitest run --reporter=verbose` |
| Full suite command | `bun run vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-05 | All 6 packages export correct APIs | unit | `bun run vitest run packages/*/src/__tests__/exports.test.ts` | Wave 0 |
| FOUND-06 | tokens.css has colors in :root not @theme, no --color-* in @theme | unit (CSS parse) | `bun run vitest run packages/ui/src/__tests__/tokens.test.ts` | Wave 0 |
| FOUND-07 | React Aria components render RTL with Arabic-Indic numerals | unit (browser mode) | `bun run vitest run packages/ui/src/__tests__/display.test.tsx` | Wave 0 |
| FOUND-08 | i18next loads AR+EN, type-safe keys, switches locale | unit | `bun run vitest run packages/i18n/src/__tests__/i18n.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun run vitest run --reporter=verbose`
- **Per wave merge:** Full vitest suite
- **Phase gate:** Full suite green + vertical slice page renders in dev server

### Wave 0 Gaps
- [ ] Root `vitest.config.ts` -- workspace config for packages/*
- [ ] `packages/ui/src/__tests__/` -- component tests
- [ ] `packages/i18n/src/__tests__/` -- i18n tests
- [ ] `packages/types/src/__tests__/` -- type export tests (basic import checks)
- [ ] Vitest install: `bun add -D vitest @vitest/browser` at root

## Sources

### Primary (HIGH confidence)
- BACKEND.md Section 13 -- TypeScript enums and entity interfaces (project spec)
- STACK-DECISION.md -- All package versions and integration patterns (project spec, audited 2026-03-28)
- UI-VISION.md -- Design system rules, glass tiers, motion patterns (project spec)
- CONTEXT.md -- Phase requirements and success criteria (locked decisions)
- tokens.css -- Existing design tokens file (verified in codebase)
- font-face.css -- Existing font declarations (verified in codebase)
- npm registry (2026-03-31) -- Version verification for all packages

### Secondary (MEDIUM confidence)
- React Aria I18nProvider SSR bug -- GitHub issue #7474 (referenced in STACK-DECISION.md)
- Motion Popover race condition -- GitHub issue #9158 (referenced in STACK-DECISION.md)
- tailwindcss-react-aria-components group modifiers -- GitHub issue #15401 (referenced in STACK-DECISION.md)

### Tertiary (LOW confidence)
- None -- all findings verified against project specs or npm registry

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified against npm registry 2026-03-31, all packages specified in STACK-DECISION.md
- Architecture: HIGH -- package structures follow monorepo conventions, component patterns from project specs
- Pitfalls: HIGH -- all documented in STACK-DECISION.md with issue numbers, verified against project rules

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable ecosystem, pinned versions)
