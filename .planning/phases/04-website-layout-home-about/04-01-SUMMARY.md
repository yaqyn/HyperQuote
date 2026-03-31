---
phase: 04-website-layout-home-about
plan: 01
subsystem: ui
tags: [react-aria, motion-v12, i18n, rtl, tailwind-v4, lucide-react]

requires:
  - phase: 03-shared-packages
    provides: i18n config, design tokens, font-face CSS, GlassWindow components
provides:
  - Website global shell (header + footer + layout route)
  - i18n website namespace with ~80 AR+EN keys including 6 category names
  - Server-side locale detection preventing RTL flash
  - Mobile nav overlay with React Aria Modal
  - Language and theme toggles
  - SectionReveal animation wrapper and JsonLd SEO helpers
  - Placeholder logo SVGs
affects: [04-02-home-page, 04-03-about-page, 05-website-market-product-detail]

tech-stack:
  added: [motion@12.38.0, lucide-react@1.7.0, zustand@5.0.12]
  patterns: [layout-route-wrapping, server-side-locale-detection, blur-on-scroll-header, cookie-locale-persistence]

key-files:
  created:
    - apps/website/src/routes/_website.tsx
    - apps/website/src/routes/_website/index.tsx
    - apps/website/src/components/layout/WebsiteHeader.tsx
    - apps/website/src/components/layout/WebsiteFooter.tsx
    - apps/website/src/components/layout/MobileNavOverlay.tsx
    - apps/website/src/components/layout/LanguageToggle.tsx
    - apps/website/src/components/layout/ThemeToggle.tsx
    - apps/website/src/components/shared/SectionReveal.tsx
    - apps/website/src/components/shared/JsonLd.tsx
    - apps/website/src/hooks/useScrolled.ts
    - apps/website/public/LyonBlack.svg
    - apps/website/public/LyonWhite.svg
    - packages/i18n/src/locales/en/website.json
    - packages/i18n/src/locales/ar/website.json
  modified:
    - packages/i18n/src/config.ts
    - apps/website/src/routes/__root.tsx
    - apps/website/src/styles.css
    - apps/website/package.json

key-decisions:
  - "Server-side locale detection reads hq-locale cookie then Accept-Language header, defaults to Arabic"
  - "LanguageToggle persists locale to both localStorage and cookie for SSR consistency"
  - "MutationObserver on data-theme attribute for reactive logo switching in header"
  - "Layout route pattern: _website.tsx wraps all website pages with header/footer"

patterns-established:
  - "Layout route pattern: _website.tsx wraps pages, __root.tsx handles html/head/body"
  - "Server-side locale: beforeLoad reads cookie/Accept-Language, passes to setupI18n and route context"
  - "Theme FOUC prevention: inline script in head reads localStorage before paint"
  - "RTL icon flip: [dir=rtl] .icon-end { transform: scaleX(-1) } class convention"
  - "Blur-on-scroll header: useScrolled hook + color-mix for CSS variable opacity"

requirements-completed: [WEB-01]

duration: 6min
completed: 2026-03-31
---

# Phase 4 Plan 1: Website Shell Summary

**Website global shell with blur-on-scroll header, 4-column footer, React Aria mobile nav, language/theme toggles, and i18n website namespace (80+ AR+EN keys including Arabic-Indic numerals)**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-31T16:35:35Z
- **Completed:** 2026-03-31T16:41:56Z
- **Tasks:** 3
- **Files modified:** 17

## Accomplishments
- Full website shell (header + footer + layout route) renders on every page with blur-on-scroll, theme-conditional logo, and responsive mobile nav
- Server-side locale detection from hq-locale cookie and Accept-Language header prevents RTL flash on Arabic pages
- i18n website namespace with all copywriting keys (nav, hero, how-it-works, value props, market categories, about, footer, a11y) in AR+EN with Arabic-Indic numerals
- Shared components (SectionReveal, JsonLd) ready for Plans 02 and 03

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies, create i18n website namespace** - `d03e0ac` (feat)
2. **Task 2: Routing restructure with SSR locale detection** - `70b6c5f` (feat)
3. **Task 3: Build header, footer, mobile nav, toggles, shared components** - `86cd0fb` (feat)

## Files Created/Modified
- `packages/i18n/src/locales/en/website.json` - English website namespace with all copywriting keys
- `packages/i18n/src/locales/ar/website.json` - Arabic website namespace with Arabic-Indic numerals
- `packages/i18n/src/config.ts` - Registers website namespace
- `apps/website/src/routes/__root.tsx` - Server-side locale detection, skip-to-content, theme FOUC prevention
- `apps/website/src/routes/_website.tsx` - Layout route wrapping pages with header + footer
- `apps/website/src/routes/_website/index.tsx` - Home page stub (no server functions)
- `apps/website/src/components/layout/WebsiteHeader.tsx` - Fixed header with blur-on-scroll, logo, nav, toggles, CTA
- `apps/website/src/components/layout/WebsiteFooter.tsx` - 4-column grid footer with bottom bar
- `apps/website/src/components/layout/MobileNavOverlay.tsx` - React Aria Modal with Motion spring/tween animations
- `apps/website/src/components/layout/LanguageToggle.tsx` - Locale switch with cookie persistence for SSR
- `apps/website/src/components/layout/ThemeToggle.tsx` - React Aria ToggleButton with Sun/Moon icons
- `apps/website/src/components/shared/SectionReveal.tsx` - IntersectionObserver spring animation wrapper
- `apps/website/src/components/shared/JsonLd.tsx` - Organization and WebSite structured data
- `apps/website/src/hooks/useScrolled.ts` - Scroll threshold hook with passive listener
- `apps/website/public/LyonBlack.svg` - Placeholder logo for light mode
- `apps/website/public/LyonWhite.svg` - Placeholder logo for dark mode
- `apps/website/src/styles.css` - RTL icon-end flip rule

## Decisions Made
- Server-side locale detection reads hq-locale cookie then Accept-Language header, defaults to Arabic (Arabic-first brand)
- LanguageToggle persists locale to both localStorage and cookie so SSR can read it on next request
- MutationObserver on data-theme attribute for reactive logo switching instead of prop drilling
- Layout route pattern: _website.tsx for shell, __root.tsx for html/head/body concerns

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## Known Stubs
- `apps/website/src/routes/_website/index.tsx` - Home page renders placeholder text, will be replaced by Plan 02 (Home page sections)
- `apps/website/public/LyonBlack.svg` and `LyonWhite.svg` - Text-based SVG placeholders until real logo is provided

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Layout shell is complete and ready for Plan 02 (Home page sections) and Plan 03 (About page)
- SectionReveal component ready for scroll-triggered animations on content sections
- JsonLd helpers ready for per-page SEO metadata
- All i18n keys for home and about pages are already defined

---
*Phase: 04-website-layout-home-about*
*Completed: 2026-03-31*
