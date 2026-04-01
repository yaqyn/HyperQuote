# HyperQuote UI Vision

**"Build the Future, Faster."**

> This document defines the design philosophy, identity, and creative direction for all five HyperQuote applications. It describes intent and feel — not implementation. When building, Claude reads this for creative direction and makes contextual implementation decisions.
>
> **Mandate:** The most modern, most unique, most premium experience possible. No classic UI. No basic UI. 100% new and different.
>
> **Identity:** B2B logistics company sourcing building materials to builders in Egypt, using the latest technology available.
>
> **Stack:** TanStack Start + React Aria Components + Motion v12 + Tailwind CSS v4 + Zustand + react-i18next. See `essential/brand/STACK-DECISION.md` for full package versions and integration patterns.

---

## 1. Identity and Philosophy

**Brand voice:** "Build the Future, Faster." HyperQuote is the first digital platform for Egypt's building materials distribution market — a market that currently runs on phone calls, WhatsApp, and paper spreadsheets.

**Visual mandate:** NOT AI slop. Real photography, real Cairo, real construction sites. Every image must be authentic — real equipment, real materials, real workers, real Egyptian construction environments. Stock photography of generic offices or AI-generated imagery is prohibited.

**Premium standard:** Every interaction must feel like iOS or Linear. Spring physics, 60fps, purposeful motion. Nothing decorative. Everything earns its place.

**Design philosophy:**
- Clarity over cleverness — data must be immediately legible
- Motion conveys meaning — windows appear because the user summoned them
- Wide space is the default — emptiness is the design, not the absence of design
- One brand, five expressions — same blue, same lion, same fonts, five different contexts

**What this is NOT:**
- Not a traditional admin dashboard with a sidebar and breadcrumbs
- Not a Stripe dashboard clone
- Not a generic SaaS template
- Not a marketing website with parallax for parallax's sake
- No traditional patterns — this must feel completely new

---

## 2. Three Colors. Period.

| Color | Role |
|-------|------|
| **White** | Space, glass panels, backgrounds |
| **Black** | Text, dark mode base, contrast |
| **Blue** | Brand accent, interactive elements, links |

That's it. No slate-200, no zinc-500, no navy variants, no different blue per app. One blue, white, black. The simplicity IS the premium.

Semantic status colors (green, yellow, red) exist for functional meaning — order confirmed, payment overdue, delivery failed. These aren't design colors, they're data.

**Dark mode** is literally inverting White and Black. Every app supports light + dark toggle. User chooses.

**Token files:** `essential/brand/colors/` — one unified palette, not per-app variants.

---

## 3. The Spatial Philosophy

Every app follows the same core pattern. The app is not a dashboard you navigate — it's a calm environment where you summon what you need.

### The Universal Flow

1. **Launch** — wide, clean, empty space. Pure white (or pure black in dark mode). No blobs, no gradients, no background decoration. The absence of decoration is what makes it premium.
2. **Login** — a glass window floats in over the empty space. Clean, minimal — credentials or SSO. The HyperQuote wordmark is softly present in the space.
3. **Authenticate** — login window fades away. A subtle "Welcome, Ahmed" appears from a corner of the screen, then fades. You're left with wide space and your entry points.
4. **Use** — tap or click an entry point. A glass window opens with the complete experience for that thing. Everything you need for that domain lives inside that window.
5. **Close** — window closes. Back to wide space. Calm.

No traditional page navigation. No URL changes swapping the entire screen. Glass windows ARE the application.

### Glass Windows

Two tiers only:
- **Window** — the main panels (orders, settings, finance, etc.). Frosted glass, floating over the space.
- **Elevated** — things that float OVER windows (modals, command palette, confirmations). Stronger glass effect to establish hierarchy.

When a window opens, everything else gently steps back. When it closes, the space welcomes you back. The emotional arc of open and close matters.

### Shadows and Depth

Panels have subtle shadows. Deeper things have stronger shadows. Shadows should feel natural and consistent — not dramatic.

### Motion

- **Spring** for entering — windows emerge, items appear, things grow
- **Tween** for exiting — windows dismiss, items fade, things shrink
- **Purposeful only** — every animation communicates something. Zero decorative motion.
- Only three speeds: fast (micro-interactions), medium (state changes), slow (layout transitions)
- Colors change instantly — never animate color transitions
- Popovers and menus use CSS transitions, not Motion v12 (avoids race conditions)

### Hover and Interaction

The space should feel responsive without being busy. Subtle hover states — a faint scale, a gentle brightness shift — make the environment feel alive through interaction, not through background animation.

---

## 4. Typography

All fonts self-hosted as WOFF2 from `essential/brand/fonts/`. Never from external URLs.

| Font | Usage |
|------|-------|
| **Inter** | All Latin text — headings, body, labels, buttons |
| **IBM Plex Sans Arabic** | All Arabic text |
| **Geist Mono** | ALL numeric data — prices, quantities, IDs, dates, timestamps. This is a brand rule. If it displays a number, it uses monospace. |

14px base for all apps. 16px for website body text.

IBM Plex Sans Arabic supports weights 100-700 only. In bilingual contexts, never use Inter 800/900 — Arabic can't match it.

All user-facing strings through `react-i18next`. Zero hardcoded English. Currency, dates, and numbers formatted per locale. Arabic-Indic numerals in Arabic context.

---

## 5. The Five Apps

### 5a. Website — `hyperquote.net`

**Type:** SSG + SSR. Marketing site, not an app.

**Feel:** Godly-level. Award-winning modern B2B. Cinematic, scroll-driven, real photography. The website is the storefront — it must make people stop and pay attention. Think sites that win Awwwards, not sites that use Bootstrap.

**Pages:**

| Page | Priority | Notes |
|------|----------|-------|
| Home | Full build | Hero, value props, how it works, CTA. Cinematic full-viewport sections. |
| About | Full build | Company story, mission, team |
| Market | Full build | THE mini-product. Browse without login, no prices shown. Submit quote requires login modal. Prices determined after employee confirmation. Functional layout, not cinematic. |
| Support | Full build | Two-tier: anonymous = contact form + FAQ. Logged-in = ticket system + human chat. |
| Legal | Full build | Privacy policy, terms of use |
| Docs | Skeleton | Layout pattern established with 2-3 example guide sections. Placeholder content. Ready to fill when apps go live. |
| Careers | Slim | Simple job listings. Could be a section on About. |
| Journey | Deferred | Low priority for launch |

**Navigation:** Fixed minimal header — logo left, nav center, CTA + language/theme toggles right. Sticky with blur on scroll. Mobile: hamburger, full-screen overlay.

**Auth:** Login modal (not page redirect). SSO cookie means login on website = logged in on portal. "View in Portal" CTAs for deeper features.

**Key rule:** Home and About are cinematic (full-viewport beats, parallax, animated text). Market, Support, Docs, Careers are functional (content-driven layouts that serve their purpose). Don't force cinematic on functional pages.

### 5b. Internal App (HQE) — `app.hyperquote.net`

**Type:** SPA. All internal business domains in one app with lazy-loaded route groups.

**Feel:** Premium command surface. Wide open space. Glass windows floating in emptiness. Keyboard-first, mouse-optional. NOT a dashboard.

**Domains:** Orders, Finance, Warehouse, Logistics, HR, Admin, Procurement, Quality, AI — each a glass window with the complete experience for that domain.

**Layout after login:**
- Wide open space
- One side has a soft vertical strip of minimal icons — one per domain. Always present but unobtrusive. Not hidden behind hover.
- Each icon opens its domain's glass window. The window contains everything for that domain — lists, details, forms, actions.
- Pressing a hotkey does the same thing (O for Orders, F for Finance, etc.)
- Closing a window returns to wide space

**Keyboard hotkeys:**
- Single-key hotkeys fire only when no input is focused
- Permission-filtered — if the employee lacks access, the icon and hotkey don't exist
- Pressing another hotkey while a window is open: crossfade swap
- Escape: close current window, return to space
- Ctrl+K: command palette (elevated glass, search everything)

**Canvas (home state):**
- Clean greeting: "Good morning, Ahmed"
- If urgent items exist: "Good morning, Ahmed — 3 items need attention" with subtle emphasis
- 1-2 contextual quick actions based on role
- No KPI cards, no metrics, no data on the canvas. Data lives inside windows.

**Notifications:** Simple badge or dot indicator. No glow, no pulse. Click opens a notifications window (glass, same pattern as everything else).

**Mobile adaptation:** Canvas shows domain icons as tappable glass cards. Tapping opens full-screen. Back gesture returns to canvas.

### 5c. Portal — `portal.hyperquote.net`

**Type:** SSR. Customers and suppliers.

**Feel:** Same spatial philosophy as Internal — wide space, glass windows. But the entry point is different: AI chat is the center of the experience.

**Layout after login:**
- Wide open space
- Centered AI chat interface — this is the primary way to interact with HyperQuote
- Two buttons beneath the chat: **Orders** and **Market**
- Each button opens a glass window with the full experience for that domain

**AI chat:** Handles everything — check order status, ask about invoices, get help, submit requests. The chat is smart enough to pull data from all domains. For customers who don't want to chat, the Orders and Market buttons are always there.

**Role switching:** Everyone is a customer by default. Users with supplier role see a supplier toggle. Supplier view adjusts the available windows (stock submission, PO management, quality requirements).

**Mobile:** Same pattern, touch-adapted spacing. Chat is still central.

### 5d. CEO Command Center — `ceo.hyperquote.net`

**Type:** SPA (PWA). Mobile-first — the CEO always uses mobile.

**Feel:** The most minimal of all apps. Mostly empty. Data on demand. The search bar IS the entire interface.

**Layout:**
- Wide empty space
- Centered search bar
- Lion watermark at barely-perceptible opacity behind search
- Nothing else. No cards, no metrics, no sidebar, no nav.

**Flows:**
- **Search:** Type any character → search bar slides up → results stream below grouped by category (employees, customers, orders, products)
- **AI:** Press Enter/Send → results fade → search slides up → AI chat rises from bottom. Back reverses.
- **Detail:** Click any result → crossfade to detail page with breadcrumb nav
- **Category:** Click a category header → elegant data table → click row for detail

**Hotkeys (desktop):** `/` focus search, `Esc` clear/go back, `Enter` for AI. No domain hotkeys — search handles everything.

**Color:** Zero accent colors. No blue for interactive elements. The only non-gray colors are semantic status (success, warning, error, info). Emphasis through typography weight and contrast, never through color.

### 5e. Driver App — `driver.hyperquote.net`

**Type:** PWA + Capacitor native.

**Feel:** Ultra-simple. Uber driver simplicity. Zero cognitive load.

**Layout:**
- Big cards, one delivery at a time
- Giant buttons: camera (proof of delivery), call customer, navigate
- Swipe to complete
- Zero complex navigation

**Technical:** Capacitor native wrapper for background GPS, offline SQLite, native camera, biometric auth. Full offline capability — delivery queue stored locally, GPS buffered, photos queued for upload on reconnect.

---

## 6. Shared Architecture

### Code Sharing

Six shared frontend packages:

| Package | Contents |
|---------|----------|
| `@hyperquote/ui` | React Aria primitives, LionMark, Skeleton, EmptyState |
| `@hyperquote/api` | TanStack Query hooks for all gateway routes |
| `@hyperquote/web-auth` | Supabase SSR + SSO cookie config |
| `@hyperquote/i18n` | react-i18next with type-safe keys |
| `@hyperquote/forms` | React Hook Form + React Aria + Zod |
| `@hyperquote/tables` | TanStack Table + React Aria |

Monorepo: Bun workspaces + Turborepo. Each app deploys as its own Cloudflare Worker.

### SSO

Supabase `@supabase/ssr` with cookies on `.hyperquote.net`. Login on any app = logged in on all apps. Logout propagation via BroadcastChannel.

### Loading States

Skeleton shimmer loaders — content-shaped gray blocks that animate. Every loading state uses skeletons matching the expected content shape. No spinners. No "Loading..." text.

### Empty States

Meaningful message + contextual CTA button. Density adapts to context. The lion mark may appear as a barely-perceptible watermark — let the design context decide.

### Error States

- Failed data fetch: inline error + retry button
- Failed action: toast notification (minimal, matches the aesthetic)
- Network offline: subtle top banner, auto-dismiss on reconnect
- Permission denied: redirect

### Toasts

Minimal toast notifications for async feedback. Success = subtle. Error = noticeable. Position: top area, stacked. Never for form validation — forms use inline field-level errors.

### RTL and Bilingual

All components support RTL + LTR. Logical CSS properties only (`ps-*`, `pe-*`, `ms-*`, `me-*` — never `margin-left`/`padding-right`). Direction set at layout level. Currency: `50,000,000 ج.م`. Dates and numbers locale-aware.

### Permissions

Unauthorized elements are **hidden**, not disabled. Frontend permission checks are UX only — the gateway validates on every API call.

### PWA

| App | PWA | Install Prompt |
|-----|-----|---------------|
| Website | No | N/A |
| Internal | Yes | In settings only. Never auto-prompt. |
| Portal | Yes | Subtle banner after 3rd visit |
| CEO | Yes | In settings only |
| Driver | No (native) | App store distribution |

### Offline (Non-Driver)

When connection drops: subtle top banner "You're offline — showing cached data." Mutations disabled. Reconnect: banner auto-dismisses, data refreshes.

---

## 7. Lion Mark

The HyperQuote lion. Two structural SVG variants: `LyonBlack.svg` for light backgrounds, `LyonWhite.svg` for dark. These are structurally different SVGs, not color swaps.

**Usage:** The lion appears on the website (hero + footer), as a subtle presence in app spaces (especially CEO and empty states), and as the brand mark where needed. Don't over-prescribe — let the design context decide where it adds vs. distracts.

**Rules:** Never stretch, rotate, add shadows, add gradients, apply gold/amber treatment, add background shapes, or modify inline. Reference by filename only.

---

## 8. Future Considerations

- **Sound design:** Premium apps increasingly use subtle audio feedback. Worth exploring in a future polish phase.
- **3D elements:** A tasteful 3D element on the website hero could elevate the experience. Deferred for now.
- **Cursor effects:** Custom cursor interactions on the website for extra polish. Future phase.

---

*Created: 2026-03-26. Revised: 2026-03-28.*
*Stack reference: `essential/brand/STACK-DECISION.md`*
*Brand reference: `essential/brand/`*
