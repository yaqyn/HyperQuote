---
paths:
  - "apps/**/*.tsx"
  - "apps/**/*.ts"
  - "packages/ui/**"
  - "packages/forms/**"
  - "packages/tables/**"
---

# Frontend Rules

## Stack (enforced)
- TanStack Start v1.167.12+ (`@tanstack/react-start`, NOT `@tanstack/start`, NOT Next.js)
- React Aria Components v1.16.0+ (NEVER shadcn, Radix, Headless UI)
- Motion v12+ (import from `motion/react`, NOT `framer-motion`)
- Tailwind CSS v4 (`@tailwindcss/vite` REQUIRED in vite.config.ts)
- React Hook Form 7 + Zod 3 (`standardSchemaResolver`, NOT `zodResolver`)
- Zustand 5 for UI state ONLY. TanStack Query 5 for server state. Never mix.

## Vite Config
Plugin order: cloudflare → tailwindcss → tanstackStart → react (react MUST be last).
NEVER install `vinxi` or `@tanstack/start`. Use `vite dev` / `vite build`.
Stay on Vite 7. Vite 8 is NOT compatible with TanStack Start.

## React 19 Gotchas
- `useWatch()` NOT `watch()` — watch() broken with React Compiler
- Ref callbacks must be explicit statements: `ref={el => { instance = el }}` NOT `ref={el => (instance = el)}`
- Never use `Date.now()` or `Math.random()` in render — causes hydration mismatch
- Context: `<MyContext value={...}>` works directly (no .Provider needed)

## React Aria Gotchas
- Pass locale EXPLICITLY to I18nProvider — auto-detection causes SSR blank flash (#7474)
- CSS transitions for Popover/Menu — Motion causes race condition (#9158)
- Slots: always specify `slot` prop when sibling has one
- For Arabic locale: use `t()` function, NOT `<Trans>` component (RTL text ordering breaks)

## Tailwind v4 Gotchas
- Colors in `:root {}`, NEVER in `@theme` — `--color-base` in @theme makes `text-base` set color
- `@plugin` NOT `@import` for plugins: `@plugin 'tailwindcss-react-aria-components'`
- `group-data-[selected]:` NOT `group-selected:` (broken in v4, #15401)
- Logical properties ONLY: `ps-4` NOT `pl-4`, `me-2` NOT `mr-2`
- Dark mode: `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))`

## Motion v12 Gotchas
- Import from `motion/react` NOT `framer-motion`
- CSS transitions for Popover/Menu. Motion+AnimatePresence for Modals ONLY.
- Spring enter (stiffness 200, damping 20), tween exit (200ms easeIn)

## SSR Gotchas
- Zustand: `skipHydration: true` + `rehydrate()` in useEffect
- Set `dir="rtl"` and `lang` on `<html>` during SSR, NOT in useEffect
- MapLibre GL: MUST wrap in `ClientOnly` — no server-side map rendering
- `cloudflare:workers` import ONLY in server functions, never in components
- Never use `navigator.language` in render — detect locale from cookie/header server-side

## i18n + Arabic
- ALL numbers → Arabic-Indic numerals when locale is Arabic. `Intl.NumberFormat('ar-EG')`.
- ALL units → Arabic translations. See FRONTEND.md DS.9 unit table.
- Number inputs: user types Western digits (0-9), display converts on blur/save.
- Legal documents (invoices, quotes, T&C): Arabic primary, always.

## Monorepo
- Import cross-package via `@hyperquote/ui`, NEVER relative paths (`../../../packages/ui`)
- Use `workspace:*` protocol for internal dependencies in package.json
- Declare ALL direct dependencies in each package (don't rely on hoisting)

## File Size
- Keep components under 800 lines. Split large files BEFORE editing.
- Use lazy route imports for code splitting (100+ routes slow Vite dev).
