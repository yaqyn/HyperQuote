---
phase: 04-website-layout-home-about
plan: 02
subsystem: ui
tags: [motion, react, i18n, seo, tailwind, lucide, spring-animations]

requires:
  - phase: 04-01
    provides: SectionReveal, JsonLd, WebsiteLayout shell, i18n website namespace
provides:
  - 5 cinematic home page sections (hero, how-it-works, value-props, market-preview, CTA)
  - ScrollIndicator component
  - Wired home page route with SEO meta and JSON-LD
affects: [05-website-market-product-detail, 06-website-remaining-pages]

tech-stack:
  added: []
  patterns: [spring-animated hero with stagger delays, SectionReveal scroll-triggered cards, trust bar LTR direction in RTL flow]

key-files:
  created:
    - apps/website/src/components/home/HeroSection.tsx
    - apps/website/src/components/home/ScrollIndicator.tsx
    - apps/website/src/components/home/HowItWorksSection.tsx
    - apps/website/src/components/home/ValuePropsSection.tsx
    - apps/website/src/components/home/MarketPreviewSection.tsx
    - apps/website/src/components/home/CTASection.tsx
  modified:
    - apps/website/src/routes/_website/index.tsx

key-decisions:
  - "Trust bar middle dots hidden on mobile (stacks vertically instead)"
  - "Market preview uses 3-col grid (not 4-col) for better category card sizing"

patterns-established:
  - "Hero spring animation: stiffness 120, damping 14, stagger 0.1s between elements"
  - "Trust bar numbers: font-mono + [direction:ltr] [unicode-bidi:embed] for RTL safety"
  - "Section cards: SectionReveal wrapper with index * 0.1 stagger delay"

requirements-completed: [WEB-02]

duration: 2min
completed: 2026-03-31
---

# Phase 4 Plan 2: Home Page Sections Summary

**Cinematic home page with 5 sections: spring-animated hero with trust bar, 4-step how-it-works with scroll reveal, 6 value prop cards in 3x2 grid, market category preview with hover zoom, and blue gradient CTA**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-31T16:44:16Z
- **Completed:** 2026-03-31T16:46:44Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- 100vh hero with spring-animated headline, subheadline, CTA buttons, and Geist Mono trust bar preserving LTR direction in RTL
- 4-step how-it-works section with SectionReveal stagger, Lucide icons, connecting dashed line on desktop
- 6 value proposition cards in responsive grid with hover lift animation
- 6 market category cards with placeholder colors, hover zoom, and i18n category names
- CTA section with gradient-cta background and portal link
- Home route wired with all sections, JSON-LD structured data, and OG meta tags

## Task Commits

1. **Task 1: HeroSection, ScrollIndicator, HowItWorksSection, ValuePropsSection** - `fbba6a1` (feat)
2. **Task 2: MarketPreviewSection, CTASection, wire Home page route** - `05d303d` (feat)

## Files Created/Modified
- `apps/website/src/components/home/HeroSection.tsx` - 100vh hero with spring animations and trust bar
- `apps/website/src/components/home/ScrollIndicator.tsx` - Bouncing ChevronDown with smooth scroll
- `apps/website/src/components/home/HowItWorksSection.tsx` - 4-step flow with SectionReveal
- `apps/website/src/components/home/ValuePropsSection.tsx` - 6 value prop cards in 3x2 grid
- `apps/website/src/components/home/MarketPreviewSection.tsx` - 6 category cards with hover zoom
- `apps/website/src/components/home/CTASection.tsx` - Blue gradient CTA section
- `apps/website/src/routes/_website/index.tsx` - Home page route wiring all sections

## Decisions Made
- Trust bar middle dots hidden on mobile (vertical stack cleaner than dots between stacked items)
- Market preview uses 3-col grid instead of 4-col for better card sizing with 6 categories

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 5 home page sections render with animations and i18n
- Ready for Phase 5 (Market/Product Detail pages) which will replace placeholder category colors with real data
- About page (04-03) can proceed independently

---
*Phase: 04-website-layout-home-about*
*Completed: 2026-03-31*
