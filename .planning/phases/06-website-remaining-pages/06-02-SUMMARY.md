---
phase: 06-website-remaining-pages
plan: 02
subsystem: ui
tags: [react, i18n, legal, careers, ssg, rtl, tailwind]

requires:
  - phase: 04-website-layout-home-about
    provides: Website layout, LanguageToggle component, i18n infrastructure
  - phase: 05-website-market-product-detail
    provides: Website routing patterns, SSG page conventions
provides:
  - Privacy policy SSG page with Arabic legally binding content
  - Terms of use SSG page with Arabic legally binding content
  - Careers SSG page with job card listings
  - LegalProse shared component for legal content rendering
  - TranslationBanner component for EN translation notice
  - JobCard component for career listings
affects: [06-website-remaining-pages, 07-portal-auth-shell]

tech-stack:
  added: []
  patterns: [legal prose max-w-800px centered layout, conditional translation banner for EN locale]

key-files:
  created:
    - apps/website/src/routes/_website/legal/privacy.tsx
    - apps/website/src/routes/_website/legal/terms.tsx
    - apps/website/src/routes/_website/careers.tsx
    - apps/website/src/components/legal/LegalProse.tsx
    - apps/website/src/components/legal/TranslationBanner.tsx
    - apps/website/src/components/careers/JobCard.tsx
  modified:
    - packages/i18n/src/locales/en/website.json
    - packages/i18n/src/locales/ar/website.json

key-decisions:
  - "Legal content as i18n keys (not markdown files) for consistency with existing pattern"
  - "TranslationBanner uses primary color at 10% opacity via Tailwind /10 syntax"

patterns-established:
  - "Legal pages: LegalProse wrapper with title + lastUpdated + children for prose content"
  - "Conditional locale rendering: check i18n.language for locale-specific UI elements"

requirements-completed: [WEB-07, WEB-08, WEB-09, WEB-12]

duration: 3min
completed: 2026-04-01
---

# Phase 06 Plan 02: Legal Pages + Careers Page Summary

**SSG legal pages (privacy/terms) with Arabic legally binding content and EN translation banner, plus careers page with job card listings**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-01T06:40:23Z
- **Completed:** 2026-04-01T06:42:54Z
- **Tasks:** 1
- **Files modified:** 8

## Accomplishments
- Privacy policy and terms of use SSG routes with 6 content sections each in Arabic and English
- TranslationBanner conditionally renders blue info banner on EN locale per Egyptian law
- LegalProse shared component with Geist Mono date, prose typography, and 800px max-width
- Careers page with 3 placeholder job cards and send-CV fallback for empty state
- Full bilingual i18n keys for all legal and careers content

## Task Commits

Each task was committed atomically:

1. **Task 1: Legal pages + Careers page (SSG routes + components)** - `b9081d5` (feat)

## Files Created/Modified
- `apps/website/src/components/legal/LegalProse.tsx` - Shared legal prose wrapper with title, date, and content slots
- `apps/website/src/components/legal/TranslationBanner.tsx` - EN-only blue translation notice banner
- `apps/website/src/components/careers/JobCard.tsx` - Glass card for job listings with location metadata
- `apps/website/src/routes/_website/legal/privacy.tsx` - Privacy policy SSG route with 6 sections
- `apps/website/src/routes/_website/legal/terms.tsx` - Terms of use SSG route with 6 sections
- `apps/website/src/routes/_website/careers.tsx` - Careers SSG route with job cards and fallback
- `packages/i18n/src/locales/en/website.json` - Added legal.* and careers.* i18n keys (EN)
- `packages/i18n/src/locales/ar/website.json` - Added legal.* and careers.* i18n keys (AR)

## Decisions Made
- Legal content stored as i18n keys rather than markdown files, consistent with existing website pattern
- TranslationBanner uses `bg-[var(--color-primary)]/10` for blue tint at 10% opacity
- LanguageToggle reused from layout components rather than building a new one for legal pages

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all legal content sections have substantive placeholder text appropriate for a pre-launch platform.

## Next Phase Readiness
- Legal pages linked from footer (privacy/terms links already exist in footer component)
- Careers page ready for real job data when available
- LegalProse component reusable for any future legal content pages

## Self-Check: PASSED

All 6 created files verified present. Commit b9081d5 verified in git log.

---
*Phase: 06-website-remaining-pages*
*Completed: 2026-04-01*
