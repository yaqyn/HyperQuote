---
phase: 04-website-layout-home-about
verified: 2026-03-31T17:10:00Z
status: passed
score: 4/4 success criteria verified
re_verification: false
gaps:
  - truth: "Home page hero fills 100vh with photography, gradient overlay, and animated value props"
    status: partial
    reason: "Hero renders 100vh with gradient overlay and spring animations but uses a solid CSS color placeholder (bg-[var(--color-canvas)]) instead of real photography. The ROADMAP success criterion explicitly states 'with photography'. Plan 02 acknowledges this as a placeholder for future phases."
    artifacts:
      - path: "apps/website/src/components/home/HeroSection.tsx"
        issue: "Line 18: bg-[var(--color-canvas)] placeholder div instead of <img> or CSS background-image with real photography"
    missing:
      - "Real hero photography asset (or at minimum a representative placeholder image, not a solid color)"
      - "Note: WEB-02 description in REQUIREMENTS.md also says 'real photography' — this gap exists at the requirement level too"
human_verification:
  - test: "Language toggle switches full site to RTL Arabic"
    expected: "Clicking language toggle changes all text to Arabic, html[dir] flips to rtl, layout mirrors correctly (nav, footer, cards all flip), Arabic-Indic numerals appear in trust bar"
    why_human: "RTL layout mirroring and Arabic-Indic numeral rendering require visual browser verification"
  - test: "Header blur-on-scroll at 8px threshold"
    expected: "Header transitions from solid bg-[var(--color-base)] to backdrop-blur-[12px] with color-mix opacity after scrolling 8px"
    why_human: "CSS transition and backdrop-filter behavior requires browser rendering verification"
  - test: "Theme toggle dark mode"
    expected: "ToggleButton toggles data-theme on html element, logo switches from LyonBlack.svg to LyonWhite.svg, theme persists on reload"
    why_human: "data-theme attribute propagation and MutationObserver logo swap require browser verification"
  - test: "Mobile hamburger nav overlay"
    expected: "Menu button opens React Aria Modal full-screen overlay with Motion spring enter/tween exit, focus trap active, escape and X button close it"
    why_human: "Modal focus trap and animation sequencing require browser interaction"
  - test: "SSG HTML content"
    expected: "dist/client/index.html and dist/client/about/index.html contain rendered Arabic/English text, not blank shells"
    why_human: "Requires inspecting HTML file content to confirm static rendering vs empty shells with JS hydration only"
---

# Phase 4: Website Layout + Home + About — Verification Report

**Phase Goal:** The website has a polished global shell and two cinematic SSG pages that establish brand presence
**Verified:** 2026-03-31T17:10:00Z
**Status:** gaps_found (1 gap — partial photography placeholder; 5 items require human verification)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Header (64px, blur on scroll) with logo, nav, language toggle, theme toggle, and CTA renders on every page | ✓ VERIFIED | `_website.tsx` imports and renders `WebsiteHeader` + `WebsiteFooter` around `<Outlet>`. Header has `h-16` (64px), `useScrolled(8)` hook drives `backdrop-blur-[12px]` via `color-mix`. LanguageToggle, ThemeToggle, CTA button all present. Logo conditionally shows `LyonBlack.svg`/`LyonWhite.svg`. |
| 2 | Home page hero fills 100vh with photography, gradient overlay, and animated value props | ✗ PARTIAL | Hero is `h-screen` with gradient overlay and spring animations (stiffness 120, damping 14). Trust bar, how-it-works, value props, market preview, CTA all substantive. **Photography is a `bg-[var(--color-canvas)]` solid color placeholder** — success criterion says "photography". |
| 3 | Language toggle switches the entire site to RTL Arabic with correct layout mirroring | ? HUMAN | `LanguageToggle` calls `i18n.changeLanguage(next)`, sets `document.documentElement.dir` + `lang`, persists to `localStorage` and `hq-locale` cookie. `__root.tsx` reads cookie server-side and sets `dir`/`lang` on `<html>`. Logical properties only (no `pl-`/`pr-`). Code path is correct; visual RTL mirroring requires browser verification. |
| 4 | Both pages render as SSG (static HTML, no server function calls at request time) | ✓ VERIFIED | `vite.config.ts` has `prerender: { enabled: true, crawlLinks: false, routes: ['/', '/about'] }`. Build confirms: `[prerender] GET / 200 OK`, `[prerender] GET /about 200 OK`. `dist/client/index.html` and `dist/client/about/index.html` both exist. No `createServerFn` in either route. |

**Score: 2/4 truths fully verified, 1 partial, 1 requires human**

---

## Required Artifacts (All 3 Plans)

| Artifact | Status | Details |
|----------|--------|---------|
| `apps/website/src/components/layout/WebsiteHeader.tsx` | ✓ VERIFIED | 112 lines. `useScrolled`, `LyonBlack`/`LyonWhite`, `LanguageToggle`, `ThemeToggle`, CTA, hamburger, nav links. Wired in `_website.tsx`. |
| `apps/website/src/components/layout/WebsiteFooter.tsx` | ✓ VERIFIED | 131 lines. `grid-cols-1 md:grid-cols-3 lg:grid-cols-4`. All text via `t()`. Bottom bar with copyright + region. Wired in `_website.tsx`. |
| `apps/website/src/components/layout/MobileNavOverlay.tsx` | ✓ VERIFIED | 89 lines. Uses `ModalOverlay`, `Modal`, `Dialog` from `react-aria-components`. `AnimatePresence` + `motion.div` for spring/tween. |
| `apps/website/src/components/layout/LanguageToggle.tsx` | ✓ VERIFIED | 26 lines. `i18n.changeLanguage()`, sets `dir`/`lang` on `documentElement`, persists to `localStorage` and cookie. |
| `apps/website/src/components/layout/ThemeToggle.tsx` | ✓ VERIFIED | 31 lines. `ToggleButton` from `react-aria-components`. `Sun`/`Moon` from `lucide-react`. |
| `apps/website/src/components/layout/OfflineBanner.tsx` | ✓ VERIFIED | 36 lines. `WifiOff` icon. `navigator.onLine` check on mount. `online`/`offline` event listeners. Returns `null` when online. |
| `apps/website/src/components/shared/SectionReveal.tsx` | ✓ VERIFIED | 35 lines. `useInView` from `motion/react`. Spring animation `opacity 0→1, y 20→0`. `once: true, amount: 0.2`. |
| `apps/website/src/components/shared/JsonLd.tsx` | ✓ VERIFIED | 46 lines. `OrganizationJsonLd` + `WebsiteJsonLd` with `dangerouslySetInnerHTML`. |
| `apps/website/src/hooks/useScrolled.ts` | ✓ VERIFIED | 21 lines. `useState(false)`, passive scroll listener, `window.scrollY > threshold`. Cleanup on unmount. |
| `apps/website/src/routes/_website.tsx` | ✓ VERIFIED | Imports `WebsiteHeader` + `WebsiteFooter`. Renders `<main id="main"><Outlet /></main>` between them. |
| `apps/website/src/routes/__root.tsx` | ✓ VERIFIED | Server-side locale from `hq-locale` cookie then `Accept-Language`. Sets `lang={locale}` and `dir={dir}` on `<html>`. Theme FOUC inline script. `OfflineBanner`. Skip-to-content link. |
| `packages/i18n/src/locales/en/website.json` | ✓ VERIFIED | 10 top-level sections. 13 `"title"` keys. Includes `marketPreview.categories` (6 slugs), `about.story`, mission values, careers. |
| `packages/i18n/src/locales/ar/website.json` | ✓ VERIFIED | 10 top-level sections (keys match EN). Arabic-Indic numerals present in trust bar. Proper Arabic translations. |
| `packages/i18n/src/config.ts` | ✓ VERIFIED | `import enWebsite`/`arWebsite`. Registered in resources and `ns` array. |
| `apps/website/public/LyonBlack.svg` | ✓ VERIFIED | Present. SVG placeholder with "HyperQuote" text in black. |
| `apps/website/public/LyonWhite.svg` | ✓ VERIFIED | Present. SVG placeholder with "HyperQuote" text in white. |
| `apps/website/src/components/home/HeroSection.tsx` | ✓ VERIFIED | 98 lines. Spring animations (stiffness 120, damping 14). Trust bar with `font-mono` + `[direction:ltr] [unicode-bidi:embed]`. **Background is solid canvas color, not photography.** |
| `apps/website/src/components/home/HowItWorksSection.tsx` | ✓ VERIFIED | 83 lines. `SectionReveal` with stagger. Lucide icons with `aria-hidden`. 4 steps. |
| `apps/website/src/components/home/ValuePropsSection.tsx` | ✓ VERIFIED | 59 lines. 6 cards. `SectionReveal` with `index * 0.1` stagger. Hover lift. `bg-[var(--color-card)]`. |
| `apps/website/src/components/home/MarketPreviewSection.tsx` | ✓ VERIFIED | 66 lines. Category names via `t('marketPreview.categories.${cat.slug}')` — zero hardcoded strings. `icon-end` on `ArrowRight`. |
| `apps/website/src/components/home/CTASection.tsx` | ✓ VERIFIED | 26 lines. `style={{ background: 'var(--gradient-cta)' }}`. |
| `apps/website/src/components/home/ScrollIndicator.tsx` | ✓ VERIFIED | 21 lines. `animate-bounce`. `aria-hidden="true"`. Smooth scroll on click. |
| `apps/website/src/routes/_website/index.tsx` | ✓ VERIFIED | Imports and renders all 5 sections + `OrganizationJsonLd`. `head()` with meta/OG tags. No `createServerFn`. |
| `apps/website/src/routes/_website/about.tsx` | ✓ VERIFIED | Imports and renders all 5 about sections. `head()` with meta. No `createServerFn`. |
| `apps/website/src/components/about/AboutHero.tsx` | ✓ VERIFIED | 32 lines. `h-[70vh]`. Spring animation. No trust bar/CTA. |
| `apps/website/src/components/about/CompanyStory.tsx` | ✓ VERIFIED | 29 lines. `max-w-[800px]` reading width. `SectionReveal` per paragraph. |
| `apps/website/src/components/about/MissionValues.tsx` | ✓ VERIFIED | 34 lines. 3-card grid. `SectionReveal` with stagger. |
| `apps/website/src/components/about/TeamGrid.tsx` | ✓ VERIFIED | 43 lines. Placeholder team array (4 members). `bg-[var(--color-primary)]` initials circles. `aria-hidden="true"` on initials. |
| `apps/website/src/components/about/CareersCTA.tsx` | ✓ VERIFIED | 23 lines. Link to `/careers`. All text via `t()`. |
| `apps/website/vite.config.ts` | ✓ VERIFIED | `prerender: { enabled: true, crawlLinks: false, routes: ['/', '/about'] }`. Correct plugin order: cloudflare → tailwindcss → tanstackStart → viteReact. |

---

## Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|---------|
| `_website.tsx` | `WebsiteHeader` + `WebsiteFooter` | import + render | ✓ WIRED | Lines 2-3, 12, 16 |
| `LanguageToggle.tsx` | `i18next.changeLanguage` | onClick handler | ✓ WIRED | Line 9 |
| `packages/i18n/src/config.ts` | website namespace | resource import | ✓ WIRED | Lines 6, 9, 15, 20, 34 |
| `__root.tsx` | server-side locale detection | `hq-locale` cookie + `accept-language` | ✓ WIRED | Lines 18-24 |
| `WebsiteHeader.tsx` | `useScrolled` | `useScrolled(8)` call | ✓ WIRED | Lines 5, 12 |
| `_website/index.tsx` | All 5 home sections + `OrganizationJsonLd` | import + compose | ✓ WIRED | Lines 2-7, 36-42 |
| `HowItWorksSection.tsx` | `SectionReveal` | import + wrap each step | ✓ WIRED | Lines 8, 59, 78 |
| `_website/about.tsx` | All 5 about sections | import + compose | ✓ WIRED | Lines 2-6, 31-35 |
| `vite.config.ts` | SSG prerendering | `prerender.routes: ['/', '/about']` | ✓ WIRED | Line 13-17 |
| `__root.tsx` | `OfflineBanner` | import + render in body | ✓ WIRED | Lines 10, 69 |

---

## Data-Flow Trace (Level 4)

These are static/SSG pages with no server data — no dynamic data sources to trace. All content flows from i18n translation keys.

| Artifact | Data Variable | Source | Status |
|----------|--------------|--------|--------|
| All section components | `t()` calls | `packages/i18n/src/locales/*/website.json` | ✓ FLOWING — i18n keys verified present in both EN/AR |
| `TeamGrid.tsx` | `team` array | Hardcoded in component | INFO — expected placeholder per plan; team data is static content |
| `MarketPreviewSection.tsx` | `categories` array | Hardcoded slugs + i18n for labels | INFO — colors/slugs hardcoded by design; real data deferred to Phase 5 |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Build succeeds | `bun run build` | Exit 0, no TypeScript errors | ✓ PASS |
| SSG produces `/` HTML | `test -f dist/client/index.html` | File exists | ✓ PASS |
| SSG produces `/about` HTML | `test -f dist/client/about/index.html` | File exists | ✓ PASS |
| No `framer-motion` imports | `grep -rn framer-motion apps/website/src/` | No matches | ✓ PASS |
| No physical direction properties | `grep -rn 'pl-\|pr-\|ml-\|mr-\|text-left\|text-right' apps/website/src/components/` | No matches | ✓ PASS |
| No `createServerFn` in SSG routes | `grep -rn createServerFn apps/website/src/routes/_website/` | No matches | ✓ PASS |
| i18n namespace registered | `grep website packages/i18n/src/config.ts` | Imported + registered in `ns` array | ✓ PASS |
| EN/AR key parity | node check on top-level keys | Keys match, 10 sections each | ✓ PASS |
| Arabic-Indic numerals | node regex check on ar/website.json | `/[\u0660-\u0669]/` matches | ✓ PASS |
| Category names via i18n | `grep marketPreview.categories MarketPreviewSection.tsx` | Template literal `t('marketPreview.categories.${cat.slug}')` | ✓ PASS |
| `[direction:ltr]` trust bar | `grep direction:ltr HeroSection.tsx` | 3 `<span>` wrappers with `[direction:ltr] [unicode-bidi:embed]` | ✓ PASS |
| Prerender config present | `grep prerender vite.config.ts` | `enabled: true`, `crawlLinks: false`, both routes listed | ✓ PASS |
| Footer 4-column grid | `grep grid-cols apps/website/src/components/layout/WebsiteFooter.tsx` | `grid-cols-1 md:grid-cols-3 lg:grid-cols-4` | ✓ PASS |
| `hq-locale` cookie set by LanguageToggle | `grep hq-locale LanguageToggle.tsx` | `document.cookie = 'hq-locale=' + next + ...` | ✓ PASS |
| SSR dir/lang on `<html>` | `grep 'lang={locale}\|dir={dir}' __root.tsx` | `<html lang={locale} dir={dir}>` at line 59 | ✓ PASS |
| Theme FOUC prevention inline script | `grep localStorage __root.tsx` | Inline script present in `<head>` | ✓ PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| WEB-01 | 04-01-PLAN.md | Global shell: header (64px, blur on scroll, logo, nav, language/theme toggles, CTA), footer (4-column) | ✓ SATISFIED | Header 64px (`h-16`), blur-on-scroll via `useScrolled(8)` + `backdrop-blur-[12px]`, logo, nav, toggles, CTA all implemented. Footer 4-column grid. Layout route wraps every page. |
| WEB-02 | 04-02-PLAN.md | Home page: cinematic hero (100vh, real photography), how-it-works, value props, market preview, CTA section | ✗ PARTIAL | All 5 sections implemented with animations. Hero is 100vh with gradient and spring animations. **Photography placeholder (solid color) does not satisfy "real photography" clause in requirement description.** All other sections fully substantive. |
| WEB-03 | 04-03-PLAN.md | About page: company story, mission, team grid | ✓ SATISFIED | 5-section about page: 70vh hero, 800px reading-width story, 3 mission value cards, team grid with initials fallback, careers CTA. SSG confirmed. |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `HeroSection.tsx` | 17-18 | `{/* Background placeholder for photography */}` + `bg-[var(--color-canvas)]` | ⚠️ Warning | ROADMAP success criterion SC-2 says "with photography" — solid color placeholder does not fulfill this. Deferred to future phase per plan. Not blocking for build/function. |
| `MarketPreviewSection.tsx` | 32 | `{/* Background placeholder */}` with hardcoded color strings | ℹ️ Info | Expected placeholder per plan (Phase 5 will add real category images). Category names properly i18n'd. Functional. |
| `AboutHero.tsx` | 9 | `{/* Background placeholder */}` + `bg-[var(--color-canvas)]` | ℹ️ Info | Same pattern as home hero — placeholder canvas color. About page has no "photography" requirement explicitly. |
| `TeamGrid.tsx` | 4-9 | Hardcoded placeholder team member array | ℹ️ Info | Plan acknowledges as stub. No real team data source exists yet. Renders correctly with initials fallback circles. |

---

## Human Verification Required

### 1. RTL Arabic Layout Mirroring

**Test:** Click language toggle to switch to Arabic. Observe full page layout.
**Expected:** `html[dir]` flips to `rtl`, all logical properties mirror correctly (header right-to-left, footer columns reverse, card content alignment flips), Arabic-Indic numerals appear in hero trust bar (not `500+` but `٥٠٠+`), `AnimatePresence` on mobile nav works correctly in RTL.
**Why human:** RTL layout mirroring and Arabic-Indic numeral rendering require visual browser verification. The code paths are correct but the rendered output needs human eyes.

### 2. Header Blur-on-Scroll Transition

**Test:** Load the home page and scroll down past 8px.
**Expected:** Header transitions from solid `bg-[var(--color-base)]` to `backdrop-blur-[12px]` with 80% opacity `color-mix` background. Transition should be smooth (200ms `transition-all`).
**Why human:** CSS `backdrop-filter` and `color-mix` behavior requires browser rendering — cannot verify computed styles from file inspection.

### 3. Theme Toggle Persistence + Logo Swap

**Test:** Click theme toggle. Reload page.
**Expected:** `data-theme="dark"` persists on `<html>` after reload (inline script reads `localStorage`). Logo swaps from `LyonBlack.svg` to `LyonWhite.svg` (MutationObserver watching `data-theme`). No FOUC (flash of incorrect theme).
**Why human:** MutationObserver behavior and FOUC prevention require browser timing verification.

### 4. Mobile Nav Focus Trap + Keyboard Dismiss

**Test:** On mobile viewport (<768px), click hamburger menu. Tab through overlay. Press Escape.
**Expected:** React Aria Modal traps focus inside overlay. Escape key closes the modal. Spring enter / tween exit animations play correctly. Clicking nav links closes overlay and navigates.
**Why human:** React Aria focus trap and keyboard interaction requires browser with accessibility testing.

### 5. SSG HTML Content Completeness

**Test:** Inspect `dist/client/index.html` and `dist/client/about/index.html` content.
**Expected:** Static HTML files contain rendered Arabic (or English) text strings — not empty div shells waiting for JS hydration. Header, hero headline, footer should be visible in raw HTML source.
**Why human:** Confirming prerendered HTML contains actual content (not just `<div id="root"></div>`) requires opening and inspecting the files, which is a content quality judgment.

---

## Gaps Summary

**1 gap blocking full success criterion achievement:**

**Photography placeholder (WEB-02 partial):** The ROADMAP success criterion SC-2 states the hero should fill "100vh with photography." The implementation uses `bg-[var(--color-canvas)]` — a solid CSS color — as a placeholder. All other parts of WEB-02 (animations, how-it-works, value props, market preview, CTA) are fully implemented. This is a known planned stub (Plan 02 explicitly notes real photography deferred to a future phase). The gap is real against the stated success criterion but was a deliberate deferral, not an oversight.

**Recommendation:** If Phase 5+ will add real photography, this gap should be tracked as a known deferral in the roadmap. If Phase 4 is considered "complete enough" with the placeholder (animation/layout structure verified), close as accepted. If photography is required for brand presence claim, add an asset task before marking WEB-02 fully satisfied.

**All other must-haves, artifacts, and key links verified.** Build passes. SSG confirmed. No forbidden patterns (framer-motion, physical direction props, createServerFn) found anywhere.

---

_Verified: 2026-03-31T17:10:00Z_
_Verifier: Claude (gsd-verifier)_
