# Phase 4: Website Layout + Home + About - Research

**Researched:** 2026-03-31
**Domain:** TanStack Start SSG website with React Aria, Motion v12 animations, i18n RTL
**Confidence:** HIGH

## Summary

Phase 4 transforms the website app from a scaffold into a polished marketing site with a global shell (header/footer), cinematic Home page, and About page -- all rendered as SSG (static HTML at build time). The codebase already has a working TanStack Start app on Cloudflare Workers with Tailwind v4, i18n, and React Aria configured. The website app is missing `motion`, `lucide-react`, and `zustand` dependencies.

TanStack Start supports static prerendering via `tanstackStart({ prerender: { routes: ['/', '/about'] } })` in vite.config.ts, available since v1.138.0 (project uses v1.167.12). Motion v12 provides `useInView` for scroll-triggered animations. The i18n system needs a new `website` namespace with ~40 keys for both AR and EN.

**Primary recommendation:** Build the layout shell first (header + footer + root route restructuring), then Home page sections top-to-bottom, then About page. Enable SSG prerendering last after all content renders correctly.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
No CONTEXT.md discussion file was found for this phase. All decisions come from the 04-UI-SPEC.md and project CLAUDE.md:
- Three colors only (white/black/blue #2563EB)
- React Aria Components for all interactive elements (Modal, ToggleButton, Link)
- Motion v12 for spring animations (`motion/react` import)
- CSS transitions for header blur and card hovers (NOT Motion)
- Tailwind v4 with colors in `:root {}` never `@theme`
- Logical properties only (`ps-*`, `pe-*`, `ms-*`, `me-*`)
- Geist Mono for ALL numbers
- SSG rendering for both pages
- i18n: zero hardcoded strings, Arabic-Indic numerals

### Claude's Discretion
- Component file organization within `apps/website/src/`
- How to structure the i18n `website` namespace (flat vs nested keys)
- IntersectionObserver implementation approach (Motion `useInView` vs native)
- SEO JSON-LD generation approach

### Deferred Ideas (OUT OF SCOPE)
- Login modal (Phase 6)
- AI chat widget (Phase 6)
- Market page content (Phase 5)
- Support, Docs, Careers pages (Phase 6)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WEB-01 | Global shell: header (64px, blur on scroll, logo, nav, language/theme toggles, CTA), footer (4-column) | React Aria Link/ToggleButton/Modal, CSS scroll-based blur, i18n toggle, theme toggle via existing `lib/theme.ts` |
| WEB-02 | Home page: cinematic hero (100vh, real photography), how-it-works, value props, market preview, CTA section | Motion v12 spring animations, `useInView` for scroll reveals, Lucide icons, Geist Mono for trust bar metrics |
| WEB-03 | About page: company story, mission, team grid | Static content page, team photo grid with initials fallback, reuses same animation patterns |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Framework:** TanStack Start (NOT Next.js). `@tanstack/react-start` ^1.167.12.
- **Components:** React Aria Components (NOT shadcn). Modal for mobile nav, ToggleButton for theme, Link for nav.
- **Animation:** Motion v12 (import from `motion/react`, NOT `framer-motion`). Spring enter, tween exit.
- **Build tool:** Vite ^7.3.1 (NOT Vite 8). Bun (NOT npm).
- **Deploy:** Cloudflare Workers.
- **Styling:** Tailwind v4. Colors in `:root {}` never `@theme`. `@tailwindcss/vite` required. `@plugin` not `@import` for plugins.
- **i18n:** react-i18next ^17.0.0 + i18next ^25.10.10. Type-safe keys. Arabic-Indic numerals.
- **RTL:** Logical properties only. `text-start` not `text-left`. `ps-*`/`pe-*`/`ms-*`/`me-*`.
- **SSR:** Pass locale explicitly to `I18nProvider` (hydration bug #7474). Set `dir`/`lang` on `<html>` during SSR.
- **Dark mode:** `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))`.

## Standard Stack

### Core (already installed in website app)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-start | ^1.167.12 | Framework + SSG prerendering | Project standard, v1 stable |
| @tanstack/react-router | ^1.168.0 | File-based routing, `Link` component | Paired with Start |
| react-aria-components | ^1.16.0 | Accessible interactive components | Project mandate |
| react-i18next | ^17.0.0 | Translation hooks | Project standard |
| i18next | ^25.10.10 | i18n core | Project standard |
| tailwindcss | ^4.2.2 | Utility CSS | Project standard |

### Must Add to website package.json
| Library | Version | Purpose | Why Needed |
|---------|---------|---------|------------|
| motion | ^12.38.0 | Spring animations, `useInView` scroll reveals | Hero text animation, section reveals. Verified current: 12.38.0 |
| lucide-react | ^1.7.0 | Icons (Sun, Moon, Menu, ChevronDown, etc.) | ~200-300 bytes/icon, tree-shaken. Verified current: 1.7.0 |
| zustand | ^5.0.12 | Theme/language state persistence | `skipHydration: true` for SSR. Verified current: 5.0.12 |

**Installation:**
```bash
cd apps/website && bun add motion lucide-react zustand
```

## Architecture Patterns

### Recommended Project Structure
```
apps/website/src/
  routes/
    __root.tsx          # Root layout: <html>, <head>, I18nProvider, WebsiteLayout
    _website.tsx        # Layout route: header + footer + <Outlet />
    _website/
      index.tsx         # Home page (/)
      about.tsx         # About page (/about)
  components/
    layout/
      WebsiteHeader.tsx      # 64px fixed header, blur on scroll
      WebsiteFooter.tsx      # 4-column footer
      MobileNavOverlay.tsx   # React Aria Modal, spring enter
      LanguageToggle.tsx     # AR/EN toggle button
      ThemeToggle.tsx        # Sun/Moon React Aria ToggleButton
      SkipToContent.tsx      # Accessibility skip link
    home/
      HeroSection.tsx        # 100vh hero with photo bg
      HowItWorksSection.tsx  # 4-step horizontal flow
      ValuePropsSection.tsx  # 6 cards, 3x2 grid
      MarketPreviewSection.tsx # Category cards with photos
      CTASection.tsx         # Blue gradient CTA
      ScrollIndicator.tsx    # ChevronDown bounce
    about/
      AboutHero.tsx          # 70vh hero
      CompanyStory.tsx       # Alternating text + photos
      MissionValues.tsx      # 3-column value cards
      TeamGrid.tsx           # Team member cards
      CareersCTA.tsx         # Careers section
    shared/
      SectionReveal.tsx      # Reusable useInView wrapper
      JsonLd.tsx             # JSON-LD structured data
  hooks/
    useScrollPosition.ts     # Scroll position for header blur
  lib/
    i18n.ts                  # Already exists
    theme.ts                 # Already exists
    seo.ts                   # Meta tag helpers
```

### Pattern 1: Layout Route for Shell
**What:** Use TanStack Router's layout route (`_website.tsx`) to wrap all website pages with header/footer.
**When to use:** Every website page shares the same shell.
**Example:**
```typescript
// routes/_website.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { WebsiteHeader } from '../components/layout/WebsiteHeader'
import { WebsiteFooter } from '../components/layout/WebsiteFooter'

export const Route = createFileRoute('/_website')({
  component: WebsiteLayout,
})

function WebsiteLayout() {
  return (
    <>
      <WebsiteHeader />
      <main id="main">
        <Outlet />
      </main>
      <WebsiteFooter />
    </>
  )
}
```

### Pattern 2: SSG Prerendering
**What:** Configure TanStack Start to generate static HTML at build time for `/` and `/about`.
**When to use:** Pages with no request-time data fetching.
**Example:**
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
        routes: ['/', '/about'],
      },
    }),
    viteReact(),
  ],
})
```
**Confidence:** HIGH -- TanStack Start prerendering supported since v1.138.0, Cloudflare announced support Dec 2025.

### Pattern 3: Scroll-Triggered Section Reveal
**What:** Reusable wrapper component using Motion `useInView` for below-the-fold sections.
**When to use:** How-it-works, value props, market preview sections.
**Example:**
```typescript
// components/shared/SectionReveal.tsx
import { useRef } from 'react'
import { motion, useInView } from 'motion/react'

interface SectionRevealProps {
  children: React.ReactNode
  delay?: number
  className?: string
}

export function SectionReveal({ children, delay = 0, className }: SectionRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{
        type: 'spring',
        stiffness: 120,
        damping: 14,
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
```

### Pattern 4: Header Blur on Scroll (CSS, NOT Motion)
**What:** CSS transition for header backdrop blur triggered by scroll position.
**When to use:** Header component only.
**Example:**
```typescript
// hooks/useScrollPosition.ts
import { useState, useEffect } from 'react'

export function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > threshold)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [threshold])

  return scrolled
}
```
```typescript
// In WebsiteHeader.tsx -- CSS class toggle, NO Motion
<header
  className={cn(
    'fixed top-0 inset-x-0 z-40 h-16 transition-all duration-200',
    scrolled
      ? 'bg-[var(--color-base)]/80 backdrop-blur-[12px]'
      : 'bg-[var(--color-base)]'
  )}
>
```

### Pattern 5: i18n Namespace for Website
**What:** Add a `website` namespace to i18n with all keys from the copywriting contract.
**When to use:** All website-specific strings.
**Example:**
```typescript
// packages/i18n/src/locales/en/website.json
{
  "cta": {
    "getQuote": "Get a Quote",
    "browseMarket": "Browse Market",
    "readyToBuild": "Ready to Build?",
    "getStartedFree": "Get Started -- Free",
    "noCreditCard": "No credit card required. Quote requests are always free."
  },
  "hero": {
    "headline": "Build the Future, Faster.",
    "subheadline": "Egypt's first digital platform for building materials sourcing.",
    "trustProducts": "500+ Products",
    "trustSuppliers": "50+ Suppliers",
    "trustResponse": "4hr Quote Response"
  },
  // ... etc per UI-SPEC copywriting contract
}
```

### Pattern 6: Mobile Nav Overlay (React Aria Modal)
**What:** Full-screen navigation overlay for mobile using React Aria Modal with spring enter animation.
**When to use:** Mobile hamburger menu.
**Example:**
```typescript
import { Modal, ModalOverlay, Dialog } from 'react-aria-components'
import { AnimatePresence, motion } from 'motion/react'

function MobileNavOverlay({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <ModalOverlay isOpen={isOpen} onOpenChange={(open) => !open && onClose()} isDismissable>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }}
          >
            <Modal>
              <Dialog aria-label="Navigation menu">
                {/* Nav links */}
              </Dialog>
            </Modal>
          </motion.div>
        </ModalOverlay>
      )}
    </AnimatePresence>
  )
}
```

### Anti-Patterns to Avoid
- **Using Motion for header blur:** CSS transitions only. Motion adds unnecessary JS overhead for a simple scroll effect.
- **`watch()` anywhere:** Use `useWatch()` per React 19 rules. (Not directly relevant to this phase but enforced globally.)
- **`text-left`/`text-right`:** Use `text-start`/`text-end` for RTL compatibility.
- **`margin-left`/`padding-right`:** Use logical properties `ms-*`/`pe-*`.
- **Hardcoded strings:** Zero. Everything through `t()` function.
- **`<Trans>` component for Arabic:** Use `t()` function instead. RTL text ordering breaks with `<Trans>`.
- **Colors in `@theme`:** Keep in `:root {}`. `--color-base` in `@theme` breaks `text-base`.
- **Server functions in SSG pages:** No `createServerFn` in Home or About loaders. Static content only.
- **`framer-motion` import:** Import from `motion/react`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scroll-triggered reveal | Custom IntersectionObserver + state | Motion `useInView` hook | Pooled observer, 0.6kb, cleanup handled |
| Accessible modal (mobile nav) | Custom dialog with focus trap | React Aria `Modal` + `ModalOverlay` | Focus trap, Escape close, aria attributes built-in |
| Theme toggle button | Custom checkbox | React Aria `ToggleButton` | `aria-pressed` state handled automatically |
| Navigation links | `<a>` tags | React Aria `Link` + TanStack Router `Link` | Active state, preloading, accessibility |
| RTL layout mirroring | Manual CSS `[dir="rtl"]` overrides | Tailwind logical properties (`ps-*`, `pe-*`) | Automatic RTL/LTR flip |
| Number formatting (Arabic-Indic) | Manual digit replacement | `@hyperquote/i18n` `formatNumber` | Handles edge cases, locale-aware |
| JSON-LD structured data | String concatenation | Small helper function with `JSON.stringify` | Type-safe, proper escaping |

## Common Pitfalls

### Pitfall 1: SSG Pages Using Server Functions
**What goes wrong:** Adding `createServerFn` to a page that should be SSG breaks static rendering -- it requires a server at request time.
**Why it happens:** Habit from other pages, or wanting to fetch data dynamically.
**How to avoid:** Home and About pages MUST NOT have server function calls in their loaders. All content is i18n keys resolved at render time.
**Warning signs:** `createServerFn` import in `index.tsx` or `about.tsx`.

### Pitfall 2: Hydration Mismatch with Theme/Language
**What goes wrong:** Server renders light/EN, client reads localStorage and renders dark/AR, causing flash and hydration error.
**Why it happens:** `localStorage` is not available during SSR.
**How to avoid:** Set `data-theme` and `lang`/`dir` on `<html>` during SSR based on cookie/header detection, not localStorage. For SSG, render default (light/EN) and apply client-side theme switch in `useEffect` with a script tag in `<head>` to prevent FOUC.
**Warning signs:** Hydration mismatch warnings in console, theme flash on page load.

### Pitfall 3: Missing Logical Properties
**What goes wrong:** Layout breaks in RTL Arabic mode. Padding appears on wrong side.
**Why it happens:** Using `pl-4` instead of `ps-4`, or `mr-2` instead of `me-2`.
**How to avoid:** Search for `pl-`, `pr-`, `ml-`, `mr-`, `left-`, `right-` in CSS classes. All must be logical equivalents.
**Warning signs:** Toggle to Arabic and check every element's spacing.

### Pitfall 4: Trust Bar Numbers Showing Arabic-Indic in Wrong Direction
**What goes wrong:** "500+" metrics in trust bar get mangled in RTL layout.
**Why it happens:** Numbers inside RTL flow without explicit `direction: ltr` on the number span.
**How to avoid:** Wrap Geist Mono number spans with `style={{ direction: 'ltr', unicodeBidi: 'embed' }}` or equivalent Tailwind (`[direction:ltr] [unicode-bidi:embed]`).
**Warning signs:** Numbers reading right-to-left or wrapping incorrectly in Arabic mode.

### Pitfall 5: Motion SSR Hydration
**What goes wrong:** Motion components with `initial` state cause hydration mismatch because server renders final state.
**Why it happens:** SSR doesn't run animations, so `initial={{ opacity: 0 }}` on server produces opacity:0 but client expects opacity:1 after animation.
**How to avoid:** For hero animations (run on load), this is acceptable -- the animation plays on hydration. For SSG prerendered pages, the static HTML will have opacity:0 and animate on client hydration, which is the desired cinematic effect.
**Warning signs:** Content invisible on page load without JS.

### Pitfall 6: Tailwind Opacity Modifier Syntax with CSS Variables
**What goes wrong:** `bg-[var(--color-base)]/80` may not work as expected in Tailwind v4.
**Why it happens:** CSS custom properties don't support the `/` opacity modifier directly in Tailwind v4 without color function wrapping.
**How to avoid:** Use `bg-[color-mix(in_srgb,var(--color-base)_80%,transparent)]` or inline style `backgroundColor: 'rgba(255,255,255,0.8)'` for the header. Alternatively, define a dedicated `--color-header-blur` token.
**Warning signs:** Header background not showing 80% opacity.

### Pitfall 7: Font Display for Arabic
**What goes wrong:** Arabic text renders in fallback font momentarily (FOUT).
**Why it happens:** IBM Plex Sans Arabic loaded with `font-display: swap`.
**How to avoid:** Already mitigated by self-hosting WOFF2 files. Consider preloading the Arabic Regular and SemiBold weights in the `<head>` for above-the-fold content.
**Warning signs:** Flash of system Arabic font on first load.

## Code Examples

### Hero Section Spring Animation (Motion v12)
```typescript
// Source: motion.dev/docs + UI-SPEC animation contract
import { motion } from 'motion/react'

function HeroContent() {
  const { t } = useTranslation('website')

  return (
    <div className="relative z-10 flex flex-col items-center justify-center h-screen text-center text-white px-4">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14 }}
        className="font-semibold text-[48px] leading-[1.1] max-md:text-[20px]"
      >
        {t('hero.headline')}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.1 }}
        className="mt-4 text-base opacity-85 max-w-[600px]"
      >
        {t('hero.subheadline')}
      </motion.p>

      {/* Trust bar with Geist Mono */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.35 }}
        className="mt-8 flex gap-6 font-mono text-sm opacity-70"
      >
        <span className="[direction:ltr] [unicode-bidi:embed]">
          {t('hero.trustProducts')}
        </span>
        <span aria-hidden="true">.</span>
        <span className="[direction:ltr] [unicode-bidi:embed]">
          {t('hero.trustSuppliers')}
        </span>
        <span aria-hidden="true">.</span>
        <span className="[direction:ltr] [unicode-bidi:embed]">
          {t('hero.trustResponse')}
        </span>
      </motion.div>
    </div>
  )
}
```

### React Aria ToggleButton for Theme
```typescript
// Source: React Aria Components docs
import { ToggleButton } from 'react-aria-components'
import { Sun, Moon } from 'lucide-react'

function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('hq-theme')
    setIsDark(stored === 'dark')
  }, [])

  function handleChange(isSelected: boolean) {
    setIsDark(isSelected)
    const theme = isSelected ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('hq-theme', theme)
  }

  return (
    <ToggleButton
      isSelected={isDark}
      onChange={handleChange}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </ToggleButton>
  )
}
```

### JSON-LD Structured Data
```typescript
// Source: schema.org/Organization
function OrganizationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'HyperQuote',
    url: 'https://hyperquote.net',
    logo: 'https://hyperquote.net/logos/LyonBlack.svg',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      areaServed: 'EG',
      availableLanguage: ['Arabic', 'English'],
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
```

### Language Toggle with RTL Flip
```typescript
import { useTranslation } from 'react-i18next'

function LanguageToggle() {
  const { i18n, t } = useTranslation()
  const isArabic = i18n.language === 'ar'

  function handleToggle() {
    const next = isArabic ? 'en' : 'ar'
    i18n.changeLanguage(next)
    document.documentElement.setAttribute('dir', next === 'ar' ? 'rtl' : 'ltr')
    document.documentElement.setAttribute('lang', next)
    localStorage.setItem('hq-locale', next)
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
      className="text-xs font-semibold px-2 py-1 rounded hover:bg-[var(--color-surface)] transition-colors"
    >
      {isArabic ? 'EN' : 'AR'}
    </button>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| framer-motion import | `motion/react` import | Motion v12 (2025) | Package renamed, import path changed |
| TanStack Start + vinxi | Pure Vite (`vite dev`/`vite build`) | v1.121.0 (2025) | No vinxi dependency, simpler config |
| Manual SSG scripts | `tanstackStart({ prerender: { routes } })` | v1.138.0 (Dec 2025) | Built-in prerendering support |
| `@tanstack/start` package | `@tanstack/react-start` | v1.121.0 | Old package frozen at v1.120.20 |
| Tailwind config.js | CSS-first `@theme` + `:root {}` | Tailwind v4 (2025) | No JS config file needed |
| `zodResolver` | `standardSchemaResolver` | @hookform/resolvers ^5 | Generic resolver for any standard schema |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.2 (no config file yet in website app) |
| Config file | none -- Wave 0 must create `apps/website/vitest.config.ts` |
| Quick run command | `cd apps/website && bun run vitest run --reporter=verbose` |
| Full suite command | `cd apps/website && bun run vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WEB-01 | Header renders with all elements, blur triggers on scroll | unit | `vitest run src/components/layout/__tests__/WebsiteHeader.test.tsx` | Wave 0 |
| WEB-01 | Footer renders 4-column grid with correct links | unit | `vitest run src/components/layout/__tests__/WebsiteFooter.test.tsx` | Wave 0 |
| WEB-01 | Language toggle switches locale and dir attribute | unit | `vitest run src/components/layout/__tests__/LanguageToggle.test.tsx` | Wave 0 |
| WEB-01 | Theme toggle switches data-theme attribute | unit | `vitest run src/components/layout/__tests__/ThemeToggle.test.tsx` | Wave 0 |
| WEB-01 | Mobile nav opens as Modal with focus trap | unit (browser mode) | `vitest run --browser src/components/layout/__tests__/MobileNavOverlay.test.tsx` | Wave 0 |
| WEB-02 | Home page renders all 5 sections | smoke | `vitest run src/routes/__tests__/home.test.tsx` | Wave 0 |
| WEB-02 | Trust bar numbers use Geist Mono font class | unit | included in home test | Wave 0 |
| WEB-03 | About page renders all sections | smoke | `vitest run src/routes/__tests__/about.test.tsx` | Wave 0 |
| WEB-01/02/03 | RTL layout mirrors correctly | manual | Manual toggle to Arabic and visual check | n/a |
| WEB-01/02/03 | SSG produces static HTML for / and /about | smoke | `vite build && ls dist/client/index.html dist/client/about/index.html` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/website && bun run vitest run --reporter=verbose`
- **Per wave merge:** Full Vitest suite
- **Phase gate:** Full suite green + SSG build verification + manual RTL check

### Wave 0 Gaps
- [ ] `apps/website/vitest.config.ts` -- test framework config
- [ ] `apps/website/src/components/layout/__tests__/` -- header, footer, toggle tests
- [ ] `apps/website/src/routes/__tests__/` -- page-level smoke tests
- [ ] Test utilities for rendering with i18n provider context

## Sources

### Primary (HIGH confidence)
- Existing codebase: `apps/website/` structure, `__root.tsx`, `styles.css`, `lib/theme.ts`, `lib/i18n.ts`
- `essential/brand/tokens.css` -- all design tokens
- `essential/brand/STACK-DECISION.md` -- verified package versions
- `04-UI-SPEC.md` -- complete UI design contract
- `04-CONTEXT.md` -- phase requirements and spec

### Secondary (MEDIUM confidence)
- [Cloudflare TanStack Start docs](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/) -- prerender config
- [TanStack Start prerendering docs](https://tanstack.com/start/latest/docs/framework/react/guide/static-prerendering) -- SSG API
- [Motion useInView docs](https://motion.dev/docs/react-use-in-view) -- scroll-triggered animations
- [Cloudflare prerendering changelog](https://developers.cloudflare.com/changelog/post/2025-12-19-tanstack-start-prerendering/) -- Dec 2025 announcement

### Tertiary (LOW confidence)
- Tailwind v4 opacity modifier with CSS variables -- needs runtime validation that `bg-[var(--color-base)]/80` works or requires alternative syntax

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all packages verified against npm registry and existing codebase
- Architecture: HIGH - patterns match existing codebase conventions from Phase 3
- SSG prerendering: MEDIUM - documented feature but not yet tested in this project's Cloudflare setup
- Pitfalls: HIGH - based on known issues documented in STACK-DECISION.md and project rules

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable stack, no expected breaking changes)
