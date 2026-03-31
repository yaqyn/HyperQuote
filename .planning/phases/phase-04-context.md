# Phase 4: Website Layout + Home + About

## Goal
The website has a polished global shell and two cinematic SSG pages that establish brand presence.

## Dependencies
Phase 3 (Shared Packages must be complete).

## Requirements

- **WEB-01**: Global shell: header (64px, blur on scroll, logo, nav, language/theme toggles, CTA), footer (4-column)
- **WEB-02**: Home page: cinematic hero (100vh, real photography), how-it-works, value props, market preview, CTA section
- **WEB-03**: About page: company story, mission, team grid

## Success Criteria
1. Header (64px, blur on scroll) with logo, nav, language toggle, theme toggle, and CTA renders on every page
2. Home page hero fills 100vh with photography, gradient overlay, and animated value props
3. Language toggle switches the entire site to RTL Arabic with correct layout mirroring
4. Both pages render as SSG (static HTML, no server function calls at request time)

## What to Build
- Root layout with header (64px, blur on scroll, logo, nav, language/theme toggles, CTA)
- Footer (4-column grid, brand, links, legal)
- Offline banner component
- Home page: hero (100vh, real photography, gradient overlay), value props, how-it-works, CTA sections
- About page: company story, mission, team
- SSG rendering for both pages
- Tailwind CSS setup with tokens.css imported
- i18n: AR/EN for all strings, RTL flip on language change

## Spec References

### 1.1 Global Layout -- Website Shell

**Header (fixed, all pages):**
- Height: 64px desktop, 56px mobile.
- Background: `var(--color-base)` with `backdrop-filter: blur(12px)` and 80% opacity on scroll. Transition: scroll position > 8px triggers blur. CSS transition, not Motion.
- Left: HyperQuote wordmark logo. `LyonBlack.svg` in light mode, `LyonWhite.svg` in dark mode. Height 28px. Links to `/`. `aria-label="HyperQuote -- Home"`.
- Center: Navigation links: "Market", "About", "Support", "Docs". React Aria `Link`. Inter 500, 14px. Active page: `var(--color-primary)` with 2px bottom border blue. Desktop only.
- Right cluster (8px gap):
  - Language toggle: "AR" or "EN", Inter 600 12px. Toggles `i18next.changeLanguage()`, sets `dir` on `<html>`, stores in localStorage.
  - Theme toggle: Lucide `Sun`/`Moon` 20px, React Aria `ToggleButton`. Sets `data-theme="dark"` on `<html>`.
  - "Get a Quote" CTA: Blue bg, white text, Inter 600 14px, h-36px, px-16px, rounded-lg. If logged in -> portal. If not -> Login Modal.
- Mobile (< 768px): Center nav hidden. Hamburger icon -> full-screen overlay (spring enter, React Aria `Modal`). Focus trapped.

**Footer (all pages):**
- Background: `var(--color-base-alt)`.
- 4-column grid (3 tablet, 1 mobile stacked). Brand column + Platform + Company + Legal.
- All links: Inter 400 14px, `var(--color-text-muted)`. Column headings: Inter 600 12px, uppercase.
- Bottom: copyright + language/region indicator.

**Offline banner:** 32px height, top of viewport, `var(--color-warning-bg)`, "You're offline" + WifiOff icon. Auto-dismisses on reconnect.

### 1.2 Home Page

**Route:** `/` | **Rendering:** SSG

**Section 1 -- Hero (100vh):**
- Background: full-bleed real photography of Egyptian construction. CSS gradient overlay: `linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.7))`.
- Headline: "Build the Future, Faster." Inter 800, 48px desktop / 32px mobile, white. Spring animation on load (opacity 0->1, translateY 20->0, stiffness 120, damping 14).
- Subheadline: "Egypt's first digital platform for building materials sourcing." Inter 400, 20px desktop, white 85%.
- CTA cluster: Primary "Get a Quote" (blue bg, white, 18px, h-56px, rounded-xl) + Secondary "Browse Market" (transparent, white border, links to `/market`).
- Trust bar: "500+ Products . 50+ Suppliers . 4hr Quote Response" -- Geist Mono 14px, white 70%.
- Scroll indicator: ChevronDown, gentle bounce animation.

**Section 2 -- How It Works:**
- 4-step horizontal flow (vertical on mobile). Each step: number (Geist Mono 600 48px), icon (Lucide 32px), title (Inter 600 18px), description.
- Steps: "Build Your List" (ClipboardList), "Get a Quote" (MessageSquare), "We Deliver" (Truck), "Track Everything" (CheckCircle).
- Scroll-triggered reveal via IntersectionObserver.

**Section 3 -- Value Propositions:**
- 6 cards in 3x2 grid. Each: bg card, rounded-xl, p-32px, shadow-sm. Hover: translateY(-2px) + shadow-md.
- Cards: AI-Powered Ordering (Bot), 4-Hour Quotes (Clock), Real-Time Tracking (MapPin), Project Organization (FolderOpen), Transparent Pricing (BadgePercent), WhatsApp Support (MessageCircle).

**Section 4 -- Market Preview:**
- 6-8 product category cards with real photography backgrounds + dark gradient overlay.
- Category name + product count badge (Geist Mono 12px). Hover: image scale(1.03). Link to `/market?category={slug}`.

**Section 5 -- CTA Section:**
- Blue gradient background. "Ready to Build?" + "Get Started -- Free" button (white bg, blue text).

### 1.3 About Page

**Route:** `/about` | **Rendering:** SSG

**Section 1 -- Hero (70vh):** Cairo skyline photo, same overlay treatment as home.
**Section 2 -- Company Story:** Max-width 800px, alternating text and photography.
**Section 3 -- Mission & Values:** 3-column value cards.
**Section 4 -- Team:** Grid of cards with headshot photos (80px circle), name (Inter 600 16px), title. Fallback: initials circle.
**Section 5 -- Careers CTA:** Link to `/careers` or "Send us your CV" email link.

### Route Map (Website)
| Route | Page | Rendering |
|-------|------|-----------|
| `/` | Home | SSG |
| `/about` | About | SSG |
| `/market` | Market Catalog | SSR |
| `/market/[slug]` | Product Detail | SSR |
| `/support` | Support | SSR |
| `/docs` | Docs | SSG |
| `/careers` | Careers | SSG |
| `/legal/privacy` | Privacy Policy | SSG |
| `/legal/terms` | Terms of Use | SSG |

## Non-Negotiable Rules
1. **Three colors only.** White, Black, Blue (#2563EB). Semantic colors for data only.
2. **Geist Mono for ALL numbers.** Trust bar metrics, product counts, etc.
3. **React Aria Components, NOT shadcn.** Modal for mobile nav, ToggleButton for theme, Link for nav.
4. **Motion v12, NOT framer-motion.** Import from `motion/react`. Spring for entering, tween for exiting.
5. **Colors in `:root {}`, NEVER in `@theme`.**
6. **Website uses 16px base font** (exception to 14px default).
7. **ALL numbers -> Arabic-Indic numerals in Arabic context.**
8. **Logical properties only:** `ps-*`, `pe-*`, `ms-*`, `me-*` -- never `margin-left`/`padding-right`.

## Known Risks & Gotchas

### Website-Specific Design Rules
- Home and About are CINEMATIC (full-viewport, parallax, animated text).
- Market, Support, Docs are FUNCTIONAL (content-driven). Don't force cinematic on functional pages.
- NOT AI slop. Real photography, real Cairo, real construction sites. No stock photography of generic offices.

### RTL/Arabic Considerations
- "ArrowRight" icons flip to "ArrowLeft" via CSS `[dir="rtl"] .icon-end { transform: scaleX(-1) }`
- Trust bar metrics maintain LTR number direction inside RTL flow (Geist Mono with `direction: ltr; unicode-bidi: embed`)
- Text aligns `text-start` (not `text-left` or `text-right`)

### SSG Rendering
- Both pages must render as SSG (static HTML). No server function calls at request time.
- Regenerated on deploy. Use TanStack Start SSG rendering mode.

## Tips
- Website uses 16px base font (exception to 14px default)
- Home/About are cinematic. Market/Support/Docs are functional. Don't force cinematic on functional pages.
- Mobile hamburger -> full-screen overlay (React Aria Modal)
- Header blur triggers on scroll position > 8px -- use CSS transition, not Motion
- All user-facing strings through i18n. Zero hardcoded English.
- Premium standard: every interaction must feel like iOS or Linear. Spring physics, 60fps, purposeful motion.
