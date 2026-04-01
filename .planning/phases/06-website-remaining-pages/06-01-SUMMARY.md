---
phase: 06-website-remaining-pages
plan: 01
subsystem: ui
tags: [react-aria, react-hook-form, zod, fuse.js, i18n, server-function, rate-limiting]

requires:
  - phase: 05-website-market-product-detail
    provides: Website layout, header/footer, i18n setup, server function patterns
  - phase: 03-shared-packages
    provides: "@hyperquote/forms (standardSchemaResolver, FormRoot), @hyperquote/i18n"
provides:
  - Support page route (/support) with contact form, FAQ accordion, contact cards
  - submitContactForm server function with IP-based rate limiting
  - Bilingual support i18n keys (EN+AR)
affects: [07-portal-auth-shell, 06-website-remaining-pages]

tech-stack:
  added: []
  patterns:
    - "Contact form: RHF + Zod + standardSchemaResolver with useWatch for live char count"
    - "FAQ accordion: React Aria DisclosureGroup + fuse.js client-side search"
    - "Rate limiting pattern: checkRateLimit with Cloudflare KV for anonymous form submissions"

key-files:
  created:
    - apps/website/src/routes/_website/support.tsx
    - apps/website/src/components/support/ContactCards.tsx
    - apps/website/src/components/support/ContactForm.tsx
    - apps/website/src/components/support/FAQAccordion.tsx
    - apps/website/src/components/support/FAQSearch.tsx
    - apps/website/src/lib/contact.ts
  modified:
    - packages/i18n/src/locales/en/website.json
    - packages/i18n/src/locales/ar/website.json

key-decisions:
  - "ContactForm uses inline Controller components rather than @hyperquote/forms field wrappers for full styling control per UI-SPEC"
  - "FAQ data hardcoded as bilingual array (question/question_ar/answer/answer_ar) for SSR compatibility"
  - "Rate limiting uses cf-connecting-ip header with x-forwarded-for fallback for IP extraction"

patterns-established:
  - "Support components: self-contained in apps/website/src/components/support/"
  - "Server function rate limiting: checkRateLimit(kv, { key, limit, windowSeconds })"

requirements-completed: [WEB-06, WEB-12]

duration: 4min
completed: 2026-04-01
---

# Phase 06 Plan 01: Support Page Summary

**Support page with RHF+Zod contact form, React Aria FAQ accordion with fuse.js search, and rate-limited submitContactForm server function**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-01T06:40:15Z
- **Completed:** 2026-04-01T06:44:30Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Contact form with 5 fields (Name, Email, Phone, Subject, Message), Zod validation showing all errors simultaneously, character count via useWatch
- FAQ accordion with 10 bilingual Q&A items, fuse.js search filtering with opacity fade for non-matches
- 3 contact cards (WhatsApp green, Email blue, Phone blue with Geist Mono number)
- submitContactForm server function with IP-based rate limiting (5/IP/60s) via Cloudflare KV
- Full bilingual i18n (EN+AR) for all support page strings

## Task Commits

Each task was committed atomically:

1. **Task 1: Support page components** - `8234d43` (feat)
2. **Task 2: Support route + server function** - `8b12899` (feat)

## Files Created/Modified
- `apps/website/src/routes/_website/support.tsx` - SSR page route with responsive 2-col layout
- `apps/website/src/components/support/ContactCards.tsx` - 3 contact option cards
- `apps/website/src/components/support/ContactForm.tsx` - RHF + Zod contact form with useWatch
- `apps/website/src/components/support/FAQAccordion.tsx` - React Aria DisclosureGroup with fuse.js
- `apps/website/src/components/support/FAQSearch.tsx` - React Aria SearchField
- `apps/website/src/lib/contact.ts` - submitContactForm server function with rate limiting
- `packages/i18n/src/locales/en/website.json` - Added support.* keys
- `packages/i18n/src/locales/ar/website.json` - Added support.* keys (Arabic)

## Decisions Made
- ContactForm uses inline Controller components rather than @hyperquote/forms field wrappers for full styling control per UI-SPEC dimensions (44px height, specific border/ring colors)
- FAQ data hardcoded as bilingual array rather than fetched from DB -- appropriate for static content that changes rarely
- Rate limiting uses cf-connecting-ip header primary, x-forwarded-for fallback for Cloudflare Workers IP extraction

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

- `apps/website/src/lib/contact.ts` line 35: `console.log` + mock ticketId instead of DB insert -- intentional per plan ("For now, log and return mock ticketId"), resolved when support_tickets table exists (Phase 13-14)

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Support page route complete, ready for integration with other Phase 06 pages
- Contact form server function uses existing rate-limit.ts infrastructure
- FAQ content can be expanded or moved to CMS later

---
*Phase: 06-website-remaining-pages*
*Completed: 2026-04-01*
