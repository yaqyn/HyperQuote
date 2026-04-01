---
phase: 06-website-remaining-pages
verified: 2026-04-01T07:30:00Z
status: gaps_found
score: 33/35 items verified (all tiers)
gaps:
  - truth: "Contact form silent error swallowing"
    status: partial
    reason: "ContactForm.tsx catch block has TODO: show error toast — server errors are silently swallowed, user gets no feedback on submitContactForm failure"
    artifacts:
      - path: "apps/website/src/components/support/ContactForm.tsx"
        issue: "Line 74: catch block only has TODO comment, no error display to user"
    missing:
      - "Replace TODO with actual error state + user-visible error message in EN+AR"
  - truth: "REQUIREMENTS.md checkbox status mismatches implemented code"
    status: partial
    reason: "WEB-08 and WEB-09 are marked unchecked ([ ]) in REQUIREMENTS.md lines 30-31 but implementations are fully present and correct. The tracking document is out of sync."
    artifacts:
      - path: ".planning/REQUIREMENTS.md"
        issue: "Lines 30-31: WEB-08 and WEB-09 show [ ] (pending) instead of [x] (complete)"
    missing:
      - "Update REQUIREMENTS.md lines 30-31 to [x] for WEB-08 and WEB-09"
human_verification:
  - test: "Login modal spring/tween animation"
    expected: "Modal opens with scale 0.95->1 spring (stiffness 260, damping 20), closes with opacity tween at 150ms — visually distinct enter vs exit"
    why_human: "Animation behavior cannot be confirmed programmatically"
  - test: "OTP 6-digit boxes auto-advance and paste"
    expected: "Typing a digit immediately focuses the next box; pasting 6 digits fills all boxes; auto-submits when all filled"
    why_human: "Requires browser interaction"
  - test: "Chat FAB pulse badge runs once"
    expected: "Green pulse badge visible on first visit, disappears after FAB is clicked once (hasSeenPulse state), does not repeat"
    why_human: "Requires browser session state to verify"
  - test: "Mobile chat bottom sheet scroll prevention"
    expected: "On screens < 768px, chat panel renders as 70vh bottom sheet via React Aria Modal, background page does not scroll while modal is open"
    why_human: "Requires mobile viewport rendering"
  - test: "SSE mock streaming token display"
    expected: "AI responses appear word-by-word (simulated token streaming) in chat panel, not all at once"
    why_human: "Requires running app — server function returns StreamChunk[] array (not true SSE), stream() adapter client-side conversion must be verified visually"
  - test: "RTL Arabic layout across all new pages"
    expected: "Support, Legal, Careers, Docs, Auth modal, Chat widget all render correctly in Arabic with RTL direction, Geist Mono numbers, Arabic-Indic numerals where applicable"
    why_human: "Visual RTL layout correctness requires browser rendering"
  - test: "Dark mode across all new pages"
    expected: "All new pages use CSS custom property colors that switch correctly in dark mode"
    why_human: "Dark mode toggle behavior requires browser"
---

# Phase 06: Website Remaining Pages — Verification Report

**Phase Goal:** Website is complete with all content pages, authentication flow, and AI chat widget
**Verified:** 2026-04-01T07:30:00Z
**Status:** gaps_found (2 gaps — 1 minor UX gap, 1 tracking discrepancy)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Support page renders with contact form, 3 contact cards, and FAQ accordion | VERIFIED | `support.tsx` 61 lines, imports ContactForm + FAQAccordion + ContactCards; responsive `lg:grid-cols-2` layout |
| 2 | Contact form validates all fields with Zod and shows inline errors simultaneously | VERIFIED | `standardSchemaResolver` + Zod schema in ContactForm.tsx; `useWatch` for character count (never `watch()`) |
| 3 | FAQ accordion expands/collapses with search filtering via fuse.js | VERIFIED | `DisclosureGroup allowsMultipleExpanded` + `new Fuse(FAQ_DATA, { threshold: 0.4 })` + `opacity-30 aria-hidden` for non-matches |
| 4 | submitContactForm server function accepts anonymous submissions with rate limiting | VERIFIED | `inputValidator()` pattern, `checkRateLimit` call (5/IP/60s), Cloudflare KV key `rate:contact:{ip}` |
| 5 | Contact form submits successfully but errors are silently swallowed | FAILED | `catch {}` block has only `// TODO: show error toast` — no user-visible error on server failure |
| 6 | Legal pages render Arabic as legally binding with English translation notice | VERIFIED | `TranslationBanner` conditionally renders when `i18n.language === 'en'`; AR i18n key contains "النسخة العربية هي الوثيقة الملزمة قانونيا." |
| 7 | Careers page shows job cards or send-CV fallback | VERIFIED | `careers.tsx` 72 lines, 3 JobCard instances, fallback text in i18n `careers.noJobs` |
| 8 | All legal/careers pages are SSG, responsive, RTL Arabic, dark mode | VERIFIED | CSS custom property colors throughout, no hardcoded light-only colors, responsive classes present |
| 9 | Login modal opens from any CTA, completes phone->OTP->account creation flow | VERIFIED | `useLoginModal.open()` wired in WebsiteHeader, HeroSection, QuoteCard, MobileBottomBar; 4-step flow in LoginModal.tsx |
| 10 | OTP input has 6 digit boxes with auto-advance, paste support, LTR direction | VERIFIED | `dir="ltr"` on container, `onPaste={handlePaste}`, `inputMode="numeric"`, raw HTML inputs (not React Aria) |
| 11 | Account claiming shows masked hint when phone matches unclaimed customer | VERIFIED | `maskCompanyName()` function in AccountClaiming.tsx: "Alpha Construction" → "A**** C***********" |
| 12 | SSO cookie concept implemented via Supabase session | VERIFIED | signOut comment "Clear session and SSO cookie", session handling in verifyOTP, dev mode fallbacks documented |
| 13 | Modal has spring enter and tween exit | VERIFIED | `stiffness: 260, damping: 20`, `scale: 0.95` initial, `opacity: { duration: 0.15, ease: 'easeOut' }` exit |
| 14 | Rate limiting: sendOTP 3/60s, verifyOTP 5/60s+15min lock, contact form 5/IP/60s | VERIFIED | `checkRateLimit` (limit:3, windowSeconds:60) in sendOTP; `checkOTPVerifyLimit` in verifyOTP; 15min lockout key; 5/60s in contact.ts |
| 15 | Get a Quote and Add to Quote CTAs open login modal | VERIFIED | `useLoginModal` imported and `open()` called in WebsiteHeader, HeroSection, QuoteCard, MobileBottomBar |
| 16 | Chat FAB (56px blue circle) appears on all website pages | VERIFIED | `h-14 w-14` (56px) blue `#2563EB`, `MessageSquare` icon, `fixed bottom-4 end-4`, mounted in `__root.tsx` |
| 17 | Clicking FAB opens chat panel with spring animation | VERIFIED | `useChatWidget().toggle()` on click; `stiffness: 300, damping: 25` spring enter in ChatPanel |
| 18 | Chat streams mock responses via TanStack AI useChat + stream() adapter | VERIFIED | `useAIChat` is sole importer of `@tanstack/ai-react`, uses `stream()` connection adapter; AG-UI protocol events in mockAGUIStream generator |
| 19 | AI chat never auto-submits actions | VERIFIED | InlineProductCard has `onAddToQuote` callback requiring explicit user interaction; no auto-submission patterns in chat flow |
| 20 | Mobile shows full-screen bottom sheet via React Aria Modal | VERIFIED | `useIsMobile()` hook with `window.matchMedia('(max-width: 767px)')`, mobile path renders `Modal` with `h-[70vh] rounded-t-2xl` |
| 21 | Docs page has sidebar navigation with ListBox and IntersectionObserver TOC | VERIFIED | `ListBox` with `ListBoxSection` groups in DocsSidebar.tsx; `new IntersectionObserver(...)` with `-80px` root margin in TableOfContents.tsx |
| 22 | Docs index loads default content | VERIFIED | `docs/index.tsx` imports `DEFAULT_SLUG` from DocsSidebar, renders DocsContent with default |
| 23 | Dynamic slug route renders matching section content | VERIFIED | `docs/$sectionSlug.tsx` reads `params.sectionSlug`, validates against known slugs, redirects invalid |
| 24 | Docs mobile sidebar becomes bottom sheet | VERIFIED | `docs/index.tsx` lines 62+: `ModalOverlay` + `Modal` for mobile sidebar with menu button trigger |
| 25 | All i18n keys present EN+AR for all new pages | VERIFIED | Verified: `support.heading`, `legal.privacy.title`, `legal.translationBanner`, `careers.heading`, `login.step1.heading`, `chat.welcome`, `docs.sidebar.gettingStarted` — all EN+AR present |

**Score:** 24/25 truths verified (1 partial — silent error swallowing)

---

## Required Artifacts

### Plan 01 — Support Page

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/website/src/routes/_website/support.tsx` | Support page route (SSR) | VERIFIED | 61 lines, responsive grid, all components imported |
| `apps/website/src/components/support/ContactForm.tsx` | RHF + Zod contact form with 5 fields | VERIFIED | 252 lines, `standardSchemaResolver`, `useWatch`, Zod schema |
| `apps/website/src/components/support/FAQAccordion.tsx` | React Aria DisclosureGroup with fuse.js search | VERIFIED | 162 lines, `DisclosureGroup allowsMultipleExpanded`, `new Fuse(...)` |
| `apps/website/src/lib/contact.ts` | submitContactForm server function with rate limiting | VERIFIED (stub noted) | 40 lines, `inputValidator()`, `checkRateLimit`, mock ticketId intentional per plan |
| `apps/website/src/components/support/ContactCards.tsx` | 3 contact option cards | VERIFIED | 50 lines, `#25D366` WhatsApp, Geist Mono phone |
| `apps/website/src/components/support/FAQSearch.tsx` | React Aria SearchField | VERIFIED | 34 lines |

### Plan 02 — Legal + Careers Pages

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/website/src/routes/_website/legal/privacy.tsx` | Privacy policy SSG page | VERIFIED | 54 lines, imports LegalProse + TranslationBanner |
| `apps/website/src/routes/_website/legal/terms.tsx` | Terms of use SSG page | VERIFIED | 54 lines |
| `apps/website/src/components/legal/TranslationBanner.tsx` | Blue info banner for EN translation notice | VERIFIED | 17 lines, `i18n.language !== 'en'` guard, correct Arabic binding text via i18n |
| `apps/website/src/components/legal/LegalProse.tsx` | Legal prose wrapper | VERIFIED | 21 lines, `text-3xl font-bold`, Geist Mono date |
| `apps/website/src/components/careers/JobCard.tsx` | Job card component | VERIFIED | 16 lines |
| `apps/website/src/routes/_website/careers.tsx` | Careers SSG page | VERIFIED | 72 lines, JobCard instances, fallback |

### Plan 03 — Auth Flow

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/website/src/hooks/useLoginModal.ts` | Zustand store for modal state | VERIFIED | 47 lines, exports `useLoginModal`, `isOpen/step/phone/open/close/setStep` |
| `apps/website/src/components/auth/LoginModal.tsx` | React Aria Modal with Motion + step orchestration | VERIFIED | 48 lines, `AnimatePresence`, `motion/react` (not framer-motion), `isDismissable`, `backdrop-blur-[4px]`, `max-w-[440px]` |
| `apps/website/src/lib/auth.ts` | sendOTP, verifyOTP, createAccount, claimAccount, signOut | VERIFIED | 350 lines, 5 real `createServerFn()` calls, all use `inputValidator()` |
| `apps/website/src/lib/rate-limit.ts` | Rate limiting helpers using Cloudflare KV counters | VERIFIED | 100 lines, exports `checkRateLimit`, `checkOTPVerifyLimit`, `clearRateLimit` |
| `apps/website/src/components/auth/PhoneStep.tsx` | Phone input with +20 prefix, WhatsApp/SMS buttons | VERIFIED | 143 lines, `#25D366`, Geist Mono, Egyptian phone regex |
| `apps/website/src/components/auth/OTPStep.tsx` | 6-digit LTR OTP boxes | VERIFIED | 223 lines, `dir="ltr"`, `onPaste`, `inputMode="numeric"` |
| `apps/website/src/components/auth/AccountCreation.tsx` | RHF + Zod form | VERIFIED | 171 lines, `useWatch` (not `watch()`), `standardSchemaResolver` |
| `apps/website/src/components/auth/AccountClaiming.tsx` | Masked company hint | VERIFIED | 101 lines, `maskCompanyName()` function |

### Plan 04 — AI Chat Widget

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/website/src/hooks/useAIChat.ts` | Abstraction over TanStack AI useChat | VERIFIED | 81 lines, sole importer of `@tanstack/ai-react`, `stream()` adapter |
| `apps/website/src/hooks/useChatWidget.ts` | Zustand store for widget state | VERIFIED | 20 lines, `isOpen/hasSeenPulse/open/close/toggle` |
| `apps/website/src/lib/chat.ts` | SSE streaming server function | VERIFIED (stream type noted) | 119 lines, `inputValidator()`, AG-UI `StreamChunk[]`, returns array (not raw SSE) — documented deviation |
| `apps/website/src/components/chat/ChatWidget.tsx` | Widget orchestrator FAB + Panel | VERIFIED | 52 lines |
| `apps/website/src/components/chat/ChatFAB.tsx` | Floating action button with pulse badge | VERIFIED | 25 lines, `MessageSquare`, `h-14 w-14`, `#16A34A` pulse |
| `apps/website/src/components/chat/ChatPanel.tsx` | Desktop panel + mobile Modal bottom sheet | VERIFIED | 126 lines, `stiffness: 300`, `Modal` for mobile, `h-[70vh]`, `matchMedia 767px` |
| `apps/website/src/components/chat/ChatMessages.tsx` | Message bubbles with RTL-aware corners | VERIFIED | 41 lines, `rtl:` prefixed corner classes |
| `apps/website/src/components/chat/ChatInput.tsx` | React Aria TextField + RTL Send flip | VERIFIED | 64 lines, `rtl:rotate-180` on Send icon |
| `apps/website/src/components/chat/TypingIndicator.tsx` | 3-dot bounce animation | VERIFIED | 17 lines, 3 spans with `animationDelay: ${i * 100}ms` |
| `apps/website/src/components/chat/InlineProductCard.tsx` | Placeholder for Phase 30 | VERIFIED (intended stub) | 39 lines, `onAddToQuote` prop, placeholder per plan |

### Plan 05 — Docs Skeleton

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/website/src/routes/_website/docs/index.tsx` | Docs landing SSG page | VERIFIED | 85 lines, imports DocsSidebar, DocsContent, mobile Modal bottom sheet |
| `apps/website/src/routes/_website/docs/$sectionSlug.tsx` | Dynamic docs section SSG page | VERIFIED | 93 lines, reads `sectionSlug` param |
| `apps/website/src/components/docs/DocsSidebar.tsx` | React Aria ListBox sidebar navigation | VERIFIED | 90 lines, `ListBox`, `ListBoxSection`, sticky `top-20` |
| `apps/website/src/components/docs/DocsContent.tsx` | Prose content area | VERIFIED | 120 lines, 9 section definitions |
| `apps/website/src/components/docs/TableOfContents.tsx` | IntersectionObserver TOC | VERIFIED | 78 lines, `new IntersectionObserver`, `hidden 2xl:block` |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `support.tsx` | `ContactForm.tsx` | component import | WIRED | `import.*ContactForm` confirmed |
| `ContactForm.tsx` | `contact.ts` | server function call | WIRED | `submitContactForm` called in onSubmit |
| `contact.ts` | `rate-limit.ts` | rate limit check | WIRED | `import { checkRateLimit, getKVNamespace } from './rate-limit'` |
| `legal/privacy.tsx` | `LegalProse.tsx` | component import | WIRED | `import { LegalProse }` confirmed |
| `LoginModal.tsx` | `useLoginModal.ts` | Zustand store | WIRED | `useLoginModal` called in component |
| `PhoneStep.tsx` | `auth.ts` | server function call | WIRED | `sendOTP` called on button click |
| `OTPStep.tsx` | `auth.ts` | server function call | WIRED | `verifyOTP` called on 6-digit fill |
| `auth.ts` | `rate-limit.ts` | rate limit check | WIRED | `checkRateLimit` and `checkOTPVerifyLimit` imported and called |
| `ChatPanel.tsx` | `useAIChat.ts` | hook call | WIRED | `useAIChat` called in ChatPanel |
| `useAIChat.ts` | `chat.ts` | stream() adapter | WIRED | `chatStreamFn` referenced via `stream()` connection adapter |
| `ChatPanel.tsx` | `react-aria-components Modal` | mobile bottom sheet | WIRED | `Modal, ModalOverlay` imported, `isMobile` guard |
| `docs/index.tsx` | `DocsSidebar.tsx` | component import | WIRED | `import { DocsSidebar, DEFAULT_SLUG }` confirmed |
| `TableOfContents.tsx` | `IntersectionObserver` API | active section tracking | WIRED | `new IntersectionObserver(...)` with ref-based heading observation |
| `__root.tsx` | `LoginModal` + `ChatWidget` | global mount | WIRED | Lines 11-12 imports, lines 82-83 renders |
| `WebsiteHeader` + `HeroSection` + `QuoteCard` + `MobileBottomBar` | `useLoginModal` | CTA gating | WIRED | All 4 files confirmed with `open: openLoginModal` destructuring |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `ContactForm.tsx` | `submitContactForm` result | `contact.ts` server fn → KV rate check → mock ticketId | Intentional mock (Phase 13 DB) | STATIC (by design — documented stub) |
| `FAQAccordion.tsx` | `FAQ_DATA` array | Hardcoded bilingual array in component | Yes — 10 real FAQ items with AR+EN | FLOWING |
| `auth.ts` server fns | Supabase session | Dev: mock success; Prod: `supabase.auth.*` | Dev mode only — intentional | STATIC in dev (by design) |
| `useAIChat.ts` | `messages` state | `stream()` adapter → `chatStreamFn` → `mockAGUIStream` generator | Mock AG-UI protocol events — real transport, mock content | FLOWING (mock content) |
| `DocsSidebar.tsx` | `DOCS_SECTIONS` | Hardcoded const in component | Yes — 9 real navigation items | FLOWING |
| `DocsContent.tsx` | section content | Hardcoded content map + i18n keys | Yes — placeholder prose per design | FLOWING |

**Note on chat streaming:** The plan anticipated this — `stream()` adapter collects `StreamChunk[]` array from server function (RPC-serialized JSON), not true wire-level SSE. Phase 30 will swap to a real SSE endpoint. Token-by-token streaming is client-side simulated. This is a documented architectural decision, not a gap.

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| rate-limit.ts exports checkRateLimit | `grep "export.*checkRateLimit" rate-limit.ts` | Found at line 32 | PASS |
| auth.ts 5 server functions with inputValidator | `grep -c "createServerFn" auth.ts` minus import | 5 real fns, all use `.inputValidator()` | PASS |
| useAIChat sole importer of @tanstack/ai-react | `grep -r "@tanstack/ai-react" apps/website/src/` | Only `useAIChat.ts` | PASS |
| OTPStep always LTR | `grep 'dir="ltr"'` | Line 163: `dir="ltr"` on container | PASS |
| ChatPanel mobile breakpoint | `matchMedia 767px` | Line 21, `useIsMobile` hook confirmed | PASS |
| LoginModal not importing framer-motion | `grep "framer-motion" LoginModal.tsx` | Not found — uses `motion/react` | PASS |
| AccountCreation uses useWatch not watch() | `grep "useWatch\|watch("` | `useWatch` found, no bare `watch(` | PASS |
| All 8 plan commits in git log | `git log --oneline \| grep commit hashes` | All 8 confirmed: 8234d43 8b12899 b9081d5 6e03610 9f42329 c91d098 e6e2732 cc09803 | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| WEB-06 | 06-01-PLAN | Support page: contact form (anonymous) + FAQ accordion | SATISFIED | Full support page with ContactForm, FAQAccordion, 3 cards, rate-limited server fn |
| WEB-07 | 06-05-PLAN | Docs page: skeleton layout with sidebar TOC, 2-3 example sections | SATISFIED | 3-column docs layout, ListBox sidebar, IntersectionObserver TOC, 9 content sections |
| WEB-08 | 06-02-PLAN | Legal pages: privacy policy + terms of use, Arabic legally binding | SATISFIED | Both routes exist, TranslationBanner conditionally shown in EN, Arabic binding text in i18n |
| WEB-09 | 06-02-PLAN | Careers page: job listings or "Send us your CV" | SATISFIED | careers.tsx with 3 JobCards + fallback noJobs state |
| WEB-10 | 06-03-PLAN | Login modal: phone OTP, account creation, account claiming | SATISFIED | 4-step flow, rate limiting, masked hint, 5 server functions |
| WEB-11 | 06-04-PLAN | AI chat widget: floating button, streaming responses, inline product cards | SATISFIED | ChatFAB + ChatPanel + useAIChat + AG-UI streaming + InlineProductCard placeholder |
| WEB-12 | All plans | All pages SSG/SSR, responsive, RTL, dark mode | SATISFIED | CSS custom properties throughout, responsive Tailwind classes, RTL logical properties |

**ORPHANED REQUIREMENTS:** None detected.

**TRACKING DISCREPANCY:** `REQUIREMENTS.md` lines 30-31 show WEB-08 and WEB-09 as `[ ]` (unchecked), contradicting the actual implementation and the Phase 6 tracking table (lines 269-270) which correctly shows "Pending" — likely a stale checkbox from before plan execution. The implementations are present and correct. This tracking doc inconsistency should be corrected.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/website/src/components/support/ContactForm.tsx` | 74 | `catch {}` block with only `// TODO: show error toast` | Warning | Server errors on form submission are silently swallowed — user sees nothing if submit fails after rate limit passes |
| `apps/website/src/lib/contact.ts` | 36-38 | `console.log` + mock ticketId, `// TODO: Insert into support_tickets` | Info | Intentional per plan — resolves Phase 13-14 when DB table exists |
| `apps/website/src/lib/auth.ts` | 78, 137, 212, 281 | `console.log` dev mode fallbacks | Info | Intentional per plan — dev mode when SUPABASE_URL not configured |
| `apps/website/src/components/chat/InlineProductCard.tsx` | all | Placeholder component for Phase 30 | Info | Intentional per plan — no real product data wired, by design |

**Stub classification:** `contact.ts` and `auth.ts` stubs are intentional per plan with documented Phase 13/14/30 resolution paths. `InlineProductCard` is a Phase 30 placeholder. Only the `ContactForm.tsx` error swallowing is an unintentional gap.

---

## Human Verification Required

### 1. Login Modal Animation

**Test:** Open any page, click "Get a Quote" or "Add to Quote"
**Expected:** Modal enters with spring (perceivable bounce, scale 0.95→1), closes with fast tween fade (150ms, no spring feel on close)
**Why human:** CSS/JS animation behavior cannot be verified from code alone

### 2. OTP 6-Digit Auto-Advance and Paste

**Test:** Enter phone number, click "Continue with WhatsApp", receive OTP, type each digit
**Expected:** Each digit typed immediately moves focus to next box; pasting a 6-digit code fills all boxes and auto-submits
**Why human:** Requires browser interaction and input event behavior

### 3. Chat FAB Pulse Badge (First-Visit Only)

**Test:** Open site for the first time (clear localStorage/Zustand), observe FAB
**Expected:** Green pulse badge visible on initial visit, disappears permanently after first click
**Why human:** Requires fresh browser session state

### 4. Mobile Chat Bottom Sheet Scroll Lock

**Test:** On a mobile-width viewport (<768px), open chat FAB
**Expected:** Full-screen 70vh bottom sheet appears via React Aria Modal, background page cannot scroll
**Why human:** Requires mobile viewport and scroll behavior testing

### 5. Mock AI Streaming Appearance

**Test:** Open chat, send a message about "cement" or "quote"
**Expected:** AI response appears word-by-word (mock token streaming via AG-UI events), not all at once
**Why human:** Requires running app — `stream()` adapter converts server array to AsyncIterable client-side; visual streaming behavior depends on runtime

### 6. RTL Arabic Layout — Full Visual Pass

**Test:** Switch language to Arabic, navigate to Support, Legal, Careers, Docs pages, open Login modal, open Chat
**Expected:** All layouts flip correctly (RTL), Geist Mono for numbers, Arabic copy renders correctly, chat Send icon flips 180deg, FAB moves to bottom-left
**Why human:** Visual RTL correctness requires browser rendering

### 7. Dark Mode — All New Pages

**Test:** Toggle dark mode, visit all new pages
**Expected:** All colors use CSS custom property values that adapt to dark theme with no hardcoded light-only colors
**Why human:** Dark mode rendering requires browser

---

## Gaps Summary

Two gaps found:

**Gap 1 (Warning) — Silent error swallowing in ContactForm:**
`ContactForm.tsx` line 74 has an empty `catch` block with only a `// TODO: show error toast` comment. If `submitContactForm` throws (network error, unexpected server error after rate limit passes), the user receives no feedback — the submit button just re-enables silently. This needs a user-visible error message in EN+AR. Fix: add an `error` state, render inline error text below the submit button on catch.

**Gap 2 (Info) — REQUIREMENTS.md checkbox staleness:**
WEB-08 (legal pages) and WEB-09 (careers page) are marked `[ ]` (unchecked) in `REQUIREMENTS.md` lines 30-31 despite both being fully implemented with all acceptance criteria met. The Phase 6 tracking table at line 269-270 contradictorily shows these as "Pending". The implementations are correct and complete — only the tracking document needs updating.

All other plan items across all 5 plans and all priority tiers are verified as implemented correctly.

---

_Verified: 2026-04-01T07:30:00Z_
_Verifier: Claude (gsd-verifier)_
