# Phase 6: Website Remaining Pages - Research

**Researched:** 2026-04-01
**Domain:** Website content pages, phone OTP authentication, AI chat widget, SSE streaming
**Confidence:** HIGH

## Summary

Phase 6 completes the website with 6 content pages (Support, Docs, Legal x2, Careers), a login modal with phone OTP authentication, and an AI chat widget with SSE streaming. The phase spans three distinct technical domains: (1) static/SSR content pages using existing patterns from Phases 4-5, (2) authentication flow using Supabase Auth `signInWithOtp` with WhatsApp/SMS channels, and (3) AI chat using TanStack AI's `useChat` hook with `fetchServerSentEvents`.

The content pages (Support, Docs, Legal, Careers) are straightforward -- they follow the existing `_website` layout route pattern and use React Aria components already established in the codebase. The login modal introduces the first authenticated flow on the website, requiring server functions for OTP send/verify/account creation with rate limiting via Cloudflare's native Rate Limiting binding. The AI chat widget requires installing `@tanstack/ai` and `@tanstack/ai-react` (both 0.x) and wrapping them behind an abstraction layer.

**Primary recommendation:** Build content pages first (lowest risk, establishes patterns), then login modal (auth foundation needed by portal phases), then AI chat widget last (highest complexity, 0.x dependency).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Login is a Modal overlay, NOT a page redirect
- OTP primary: WhatsApp. Fallback: SMS after 30s. Voice after 60s
- SSO cookie on `.hyperquote.net` -- login on any app = logged in on all apps
- React Aria Components for all interactive elements (Modal, TextField, Select, TextArea, Disclosure)
- Geist Mono for phone numbers, OTP digits, countdown timers, character counts
- Arabic-Indic numerals in Arabic context
- `useWatch()`, NEVER `watch()` for React Hook Form
- `.inputValidator()`, NOT `.validator()` for server functions
- AI chat never auto-submits -- every action needs user confirmation
- AI never reveals supplier costs, margin data, or internal pricing
- Website Login Modal does NOT include PIN setup (3 steps only: Phone -> OTP -> Account Creation)
- Rate limiting via Cloudflare KV counters (sendOTP: 3/60s, verifyOTP: 5/60s then 15min lock, submitContactForm: 5/IP/60s)

### Claude's Discretion
- Internal component organization and file structure
- FAQ content (10-15 placeholder items)
- Docs skeleton content
- Legal page placeholder content structure
- Careers page placeholder job listings
- AI chat welcome message behavior and first-message auto-send

### Deferred Ideas (OUT OF SCOPE)
- PIN setup (belongs to Driver App Phase 24 and Portal)
- Voice OTP fallback implementation (spec mentions 60s but no server function defined -- stub only)
- Real AI backend integration (mock SSE responses for now)
- Real Supabase OTP provider configuration (Twilio/Vonage setup is infrastructure, not code)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WEB-06 | Support page: contact form (anonymous) + FAQ accordion | React Aria Disclosure/DisclosureGroup for accordion, RHF + Zod for form, fuse.js for FAQ search, server function for form submission |
| WEB-07 | Docs page: skeleton layout with sidebar TOC | React Aria ListBox for sidebar nav, IntersectionObserver for TOC, SSG rendering |
| WEB-08 | Legal pages: privacy + terms (Arabic legally binding) | SSG pages, markdown prose styling, translation banner component |
| WEB-09 | Careers page: job listings or "Send us your CV" | SSG page, simple card layout, mailto fallback |
| WEB-10 | Login modal: phone OTP -> verify -> account creation/claiming | React Aria Modal + Motion animation, Supabase signInWithOtp, server functions with rate limiting |
| WEB-11 | AI chat widget: floating button -> mini chat panel, SSE streaming | TanStack AI useChat + fetchServerSentEvents (0.x, wrap in abstraction), Motion for panel animation |
| WEB-12 | All pages responsive, RTL Arabic, dark mode | Existing Tailwind v4 logical properties, CSS custom properties for dark mode, existing i18n setup |
</phase_requirements>

## Standard Stack

### Core (already installed in website app)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-aria-components | ^1.16.0 | Modal, Disclosure, TextField, Select, ListBox, SearchField | Project mandate, already in use |
| motion | ^12.38.0 | Modal spring/tween, chat panel animation | Project mandate, already in use |
| react-hook-form | ^7.72.0 | Contact form, account creation form | Project mandate, via @hyperquote/forms |
| zod | ^4.3.6 | Input validation schemas | Already in website package.json |
| fuse.js | ^7.1.0 | FAQ search filtering | Already in website, used in market search |
| zustand | ^5.0.12 | Chat widget open/close state, login modal state | Already in use for quote cart |

### New Dependencies (must install)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/ai | ^0.9.1 | Server-side AI chat stream generation | AI chat server function |
| @tanstack/ai-react | ^0.7.5 | useChat hook, fetchServerSentEvents | AI chat widget client |
| @cloudflare/tanstack-ai | ^0.1.6 | Cloudflare Workers AI + AI Gateway adapter | AI chat server function on Workers |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Cloudflare Rate Limiting binding | Cloudflare KV counters (per CONTEXT.md) | Rate Limiting binding is purpose-built (zero latency, automatic counter management) but limited to 10s or 60s periods. KV approach gives more flexibility (15min lock) but has 60s min TTL and 1 write/sec/key limit. **Use both**: Rate Limiting binding for simple send/submit limits, KV for the 15min lockout on failed OTP verify. |
| TanStack AI | Vercel AI SDK | TanStack AI is the project-mandated choice, native Start integration |
| Custom SSE streaming | TanStack AI useChat | useChat handles reconnection, message state, abort -- don't rebuild |

**Installation:**
```bash
cd apps/website && bun add @tanstack/ai @tanstack/ai-react @cloudflare/tanstack-ai
```

## Architecture Patterns

### New Routes Structure
```
src/routes/_website/
  support.tsx           # SSR - contact form + FAQ
  careers.tsx           # SSG - job listings
  legal/
    privacy.tsx         # SSG - privacy policy
    terms.tsx           # SSG - terms of use
  docs/
    index.tsx           # SSG - docs landing
    $sectionSlug.tsx    # SSG - docs section pages
```

### New Components Structure
```
src/components/
  support/
    ContactCards.tsx       # 3 contact method cards
    ContactForm.tsx        # RHF form with Zod validation
    FAQAccordion.tsx       # Disclosure group with search
    FAQSearch.tsx          # SearchField with fuse.js
  legal/
    LegalProse.tsx         # Markdown prose renderer
    TranslationBanner.tsx  # Blue info banner for EN
  docs/
    DocsSidebar.tsx        # ListBox navigation
    DocsContent.tsx        # Prose content area
    TableOfContents.tsx    # IntersectionObserver TOC
  careers/
    JobCard.tsx            # Job listing card
  auth/
    LoginModal.tsx         # Main modal orchestrator (step state machine)
    PhoneStep.tsx          # Phone input + WhatsApp/SMS buttons
    OTPStep.tsx            # 6-digit OTP input
    AccountCreation.tsx    # Company + name form
    AccountClaiming.tsx    # Masked hint + confirm/deny
  chat/
    ChatWidget.tsx         # Main widget orchestrator
    ChatFAB.tsx            # Floating action button
    ChatPanel.tsx          # Chat panel container
    ChatMessages.tsx       # Message list + bubbles
    ChatInput.tsx          # TextField + send button
    TypingIndicator.tsx    # 3-dot animation
    InlineProductCard.tsx  # Product card in AI message
  shared/
    Countdown.tsx          # Reusable countdown timer (Geist Mono)
```

### New Server Functions Structure
```
src/lib/
  auth.ts               # sendOTP, verifyOTP, createAccount, claimAccount, signOut
  contact.ts            # submitContactForm
  chat.ts               # AI chat SSE endpoint
  rate-limit.ts         # Rate limiting helpers (KV + binding)
```

### Pattern 1: Login Modal Step State Machine

**What:** Multi-step modal with Zustand state managing current step, phone number, and session.
**When to use:** Any multi-step modal flow.

```typescript
// src/hooks/useLoginModal.ts
import { create } from 'zustand'

type LoginStep = 'phone' | 'otp' | 'create' | 'claiming'

interface LoginModalState {
  isOpen: boolean
  step: LoginStep
  phone: string
  redirectTo: string | null
  open: (redirectTo?: string) => void
  close: () => void
  setStep: (step: LoginStep) => void
  setPhone: (phone: string) => void
}

export const useLoginModal = create<LoginModalState>((set) => ({
  isOpen: false,
  step: 'phone',
  phone: '',
  redirectTo: null,
  open: (redirectTo) => set({ isOpen: true, step: 'phone', phone: '', redirectTo: redirectTo ?? null }),
  close: () => set({ isOpen: false, step: 'phone', phone: '' }),
  setStep: (step) => set({ step }),
  setPhone: (phone) => set({ phone }),
}))
```

### Pattern 2: Server Function with Rate Limiting

**What:** Server function using Cloudflare Rate Limiting binding + KV for lockout.
**When to use:** OTP endpoints, contact form submission.

```typescript
// src/lib/auth.ts
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'

const sendOTPInput = z.object({
  phone: z.string().regex(/^(\+20)?[0-9]{10}$/),
  method: z.enum(['whatsapp', 'sms']),
})

export const sendOTP = createServerFn()
  .inputValidator(sendOTPInput)
  .handler(async ({ data: input }) => {
    const request = getRequest()
    // Access Cloudflare bindings via request context
    // Rate limit check, then call Supabase signInWithOtp
    // Return { success: true, expiresIn: 300 }
  })
```

### Pattern 3: AI Chat with useChat Abstraction

**What:** Thin wrapper around TanStack AI's useChat to isolate 0.x API surface.
**When to use:** Any AI chat surface in the app.

```typescript
// src/hooks/useAIChat.ts - abstraction layer over 0.x API
import { fetchServerSentEvents, useChat } from '@tanstack/ai-react'

export function useAIChat() {
  const chat = useChat({
    connection: fetchServerSentEvents('/api/chat'),
  })

  return {
    messages: chat.messages,
    sendMessage: chat.sendMessage,
    isLoading: chat.isLoading,
    error: chat.error,
    stop: chat.stop,
  }
}
```

### Pattern 4: React Aria Disclosure Accordion with Search

**What:** DisclosureGroup with fuse.js filtering.
**When to use:** FAQ section.

```typescript
import { DisclosureGroup, Disclosure, DisclosureHeader, DisclosurePanel, Button } from 'react-aria-components'
import Fuse from 'fuse.js'

// DisclosureGroup manages single/multiple expansion
// Each Disclosure needs a unique id prop for expandedKeys tracking
// allowsMultipleExpanded={true} for FAQ (let users open multiple)
// Non-matching items: opacity-30 + aria-hidden={true}
```

### Pattern 5: React Aria Modal with Motion Animation

**What:** ModalOverlay + Modal with spring enter / tween exit via Motion.
**When to use:** Login modal.

```typescript
import { Modal, ModalOverlay, Dialog } from 'react-aria-components'
import { AnimatePresence, motion } from 'motion/react'

// CRITICAL: isKeyboardDismissDisabled per CLAUDE.md
// Spring enter: scale 0.95->1, opacity 0->1, stiffness 260, damping 20
// Tween exit: opacity 1->0, 150ms
// Use motion.create() to wrap React Aria components for motion values
```

### Pattern 6: Supabase Phone OTP Flow

**What:** Complete signInWithOtp -> verifyOtp -> session flow.
**When to use:** Login modal.

```typescript
// Server-side flow in auth.ts server functions:
// 1. sendOTP: supabase.auth.signInWithOtp({ phone, options: { channel: 'whatsapp' } })
// 2. verifyOTP: supabase.auth.verifyOtp({ phone, token: code, type: 'sms' })
//    - Returns { data: { session, user } } on success
//    - Existing user: session returned, done
//    - New phone: no existing user, proceed to account creation
// 3. createAccount: Insert into customers table, link to auth.users
// 4. claimAccount: Match phone to unclaimed customer, link auth.users

// SSO Cookie: Supabase session cookies are set by @supabase/ssr
// Domain must be configured in Supabase dashboard for .hyperquote.net
```

### Anti-Patterns to Avoid
- **watch() in React Hook Form:** Always useWatch(). watch() is broken with React 19 / React Compiler.
- **Module-level Supabase client:** Workers are long-lived isolates. Create client inside each handler.
- **Direct TanStack AI imports in components:** Always go through abstraction (useAIChat hook). The 0.x API will change.
- **Custom OTP input with contentEditable:** Use 6 individual `<input>` elements with type="tel", maxLength=1, inputMode="numeric". Handle auto-advance via onInput event.
- **CSS animations for Modal:** Use Motion AnimatePresence for Modal (spring enter, tween exit). CSS transitions are for Popover/Menu only (per Motion race condition #9158).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE streaming chat | Custom EventSource + state management | `useChat` from `@tanstack/ai-react` | Handles reconnection, abort, message state, loading state |
| FAQ accordion | Custom expand/collapse with aria | React Aria `DisclosureGroup` + `Disclosure` | Proper ARIA accordion pattern, keyboard nav, find-in-page support |
| Fuzzy search | Custom string matching | `fuse.js` | Already in the project, handles Arabic text, configurable thresholds |
| Rate limiting | Custom KV counter logic | Cloudflare Rate Limiting binding (`ratelimits` in wrangler.jsonc) + KV for lockout only | Purpose-built, zero latency, automatic counter management |
| OTP input boxes | Custom div-based digit inputs | 6 individual `<input type="tel">` with JS auto-advance | Paste support, inputMode numeric, mobile keyboard |
| Modal animation | CSS transitions on Modal | Motion `AnimatePresence` + `motion.div` | Spring physics, exit animations, React Aria compatibility |
| Phone validation | Custom regex per carrier | Zod schema: `z.string().regex(/^(10\|11\|12\|15)\d{8}$/)` | Single source of truth, reusable, carrier detection built into regex groups |

**Key insight:** This phase touches auth, AI, and content -- three domains where hand-rolling creates security holes (auth), fragile streams (AI), and accessibility gaps (content). Use the established libraries.

## Common Pitfalls

### Pitfall 1: OTP Box Paste Handling
**What goes wrong:** Users paste a 6-digit code and only the first digit appears.
**Why it happens:** Individual input elements don't coordinate paste events.
**How to avoid:** Listen for `onPaste` on the container, split the pasted string into characters, distribute across all 6 inputs, auto-submit if 6 digits present.
**Warning signs:** QA reports "paste doesn't work" on mobile.

### Pitfall 2: SSO Cookie Domain Mismatch
**What goes wrong:** Login on website doesn't persist to portal.
**Why it happens:** Supabase sets cookies on the current domain, not the parent `.hyperquote.net`.
**How to avoid:** Configure `cookieOptions.domain` in Supabase client to `.hyperquote.net`. In dev, use localhost (cookies don't need domain for same-origin).
**Warning signs:** Login works on website but portal still redirects to login.

### Pitfall 3: Motion + React Aria Modal Z-Index
**What goes wrong:** Modal overlay appears above content but behind the header.
**Why it happens:** React Aria portals to document.body but z-index stacking context conflicts with sticky header.
**How to avoid:** Ensure ModalOverlay has z-50 or higher. The sticky header should be z-40 max.
**Warning signs:** Modal backdrop visible but header shows through.

### Pitfall 4: TanStack AI 0.x API Breakage
**What goes wrong:** Upgrade breaks chat widget.
**Why it happens:** 0.x semver allows breaking changes in minor versions.
**How to avoid:** Pin exact versions in package.json. Wrap ALL useChat usage behind `useAIChat` abstraction. Only one file imports from `@tanstack/ai-react` directly.
**Warning signs:** Build fails after `bun update`.

### Pitfall 5: OTP Direction in RTL
**What goes wrong:** OTP digit boxes read right-to-left, confusing users.
**Why it happens:** RTL dir on parent propagates to OTP container.
**How to avoid:** Set `dir="ltr"` explicitly on OTP container div. Number entry is always LTR per spec.
**Warning signs:** First digit appears in rightmost box in Arabic mode.

### Pitfall 6: Rate Limiting KV Write-Per-Second Limit
**What goes wrong:** Rapid OTP attempts cause KV write failures.
**Why it happens:** Cloudflare KV has a 1 write/sec/key limit.
**How to avoid:** Use Cloudflare Rate Limiting binding for the fast path (3 attempts/60s). Only use KV for the 15-minute lockout flag (single write, then reads only). The binding has no write-per-second limit.
**Warning signs:** 429 errors from KV, not from rate limit logic.

### Pitfall 7: FAQ Search Not Filtering in Arabic
**What goes wrong:** Arabic search terms don't match FAQ items.
**Why it happens:** fuse.js default tokenizer may not handle Arabic diacritics.
**How to avoid:** Set `useExtendedSearch: false`, `threshold: 0.4`, search both `question` and `question_ar` keys. Test with common Arabic search terms.
**Warning signs:** Arabic FAQ search always shows "no results".

### Pitfall 8: Chat Widget Blocks Page Scroll on Mobile
**What goes wrong:** When chat is open as bottom sheet, background page still scrolls.
**Why it happens:** Touch events propagate through the sheet.
**How to avoid:** Use React Aria Modal for mobile chat sheet (it handles scroll locking via `usePreventScroll`). The desktop panel is not a modal so it doesn't block scrolling.
**Warning signs:** Page content scrolls behind the mobile chat sheet.

## Code Examples

### React Aria Disclosure Accordion with Fuse.js

```typescript
// Source: react-aria.adobe.com/DisclosureGroup + fuse.js docs
import { useState, useMemo } from 'react'
import {
  DisclosureGroup,
  Disclosure,
  Heading,
  Button,
  DisclosurePanel,
} from 'react-aria-components'
import Fuse from 'fuse.js'
import { ChevronDown } from 'lucide-react'

interface FAQItem {
  id: string
  question: string
  question_ar: string
  answer: string
  answer_ar: string
}

function FAQAccordion({ items, searchQuery, locale }: {
  items: FAQItem[]
  searchQuery: string
  locale: 'ar' | 'en'
}) {
  const fuse = useMemo(() => new Fuse(items, {
    keys: ['question', 'question_ar'],
    threshold: 0.4,
  }), [items])

  const matchedIds = searchQuery
    ? new Set(fuse.search(searchQuery).map(r => r.item.id))
    : null

  return (
    <DisclosureGroup allowsMultipleExpanded>
      {items.map((item) => {
        const isMatch = matchedIds === null || matchedIds.has(item.id)
        return (
          <Disclosure
            key={item.id}
            id={item.id}
            className={isMatch ? 'opacity-100' : 'opacity-30'}
            aria-hidden={!isMatch}
          >
            <Heading level={3}>
              <Button className="flex w-full items-center justify-between p-4">
                <span>{locale === 'ar' ? item.question_ar : item.question}</span>
                <ChevronDown className="transition-transform duration-200 data-[expanded]:rotate-180" />
              </Button>
            </Heading>
            <DisclosurePanel className="px-4 pb-4">
              {locale === 'ar' ? item.answer_ar : item.answer}
            </DisclosurePanel>
          </Disclosure>
        )
      })}
    </DisclosureGroup>
  )
}
```

### OTP 6-Digit Input with Auto-Advance and Paste

```typescript
// Source: custom pattern, verified approach for phone OTP UX
import { useRef, useCallback } from 'react'

function OTPInput({ onComplete }: { onComplete: (code: string) => void }) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  const handleInput = useCallback((index: number, value: string) => {
    if (value.length === 1 && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
    // Check if all 6 filled -> auto-submit
    const code = inputsRef.current.map(i => i?.value ?? '').join('')
    if (code.length === 6) onComplete(code)
  }, [onComplete])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    text.split('').forEach((char, i) => {
      if (inputsRef.current[i]) {
        inputsRef.current[i]!.value = char
      }
    })
    if (text.length === 6) onComplete(text)
    else inputsRef.current[text.length]?.focus()
  }, [onComplete])

  return (
    <div dir="ltr" className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el }}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          className="w-12 h-12 text-center font-[family-name:var(--font-geist-mono)] text-base
                     rounded-lg border border-[var(--color-border)]
                     focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none
                     bg-[var(--color-card)]"
          onInput={(e) => handleInput(i, (e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !(e.target as HTMLInputElement).value && i > 0) {
              inputsRef.current[i - 1]?.focus()
            }
          }}
        />
      ))}
    </div>
  )
}
```

### Supabase Phone OTP Server Functions

```typescript
// Source: supabase.com/docs/guides/auth/phone-login
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createSupabaseServerClient } from '@hyperquote/auth/server'
import { z } from 'zod'

const phoneSchema = z.string().regex(/^(10|11|12|15)\d{8}$/)

export const sendOTP = createServerFn()
  .inputValidator(z.object({
    phone: phoneSchema,
    method: z.enum(['whatsapp', 'sms']),
  }))
  .handler(async ({ data: input }) => {
    const request = getRequest()
    const { client } = createSupabaseServerClient({
      request,
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
    })

    // Rate limit check here (see rate-limit.ts pattern)

    const { error } = await client.auth.signInWithOtp({
      phone: `+20${input.phone}`,
      options: { channel: input.method },
    })

    if (error) return { success: false, error: error.message }
    return { success: true, expiresIn: 300 }
  })

export const verifyOTP = createServerFn()
  .inputValidator(z.object({
    phone: phoneSchema,
    code: z.string().length(6).regex(/^\d{6}$/),
  }))
  .handler(async ({ data: input }) => {
    const request = getRequest()
    const { client, responseCookies } = createSupabaseServerClient({
      request,
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
    })

    const { data, error } = await client.auth.verifyOtp({
      phone: `+20${input.phone}`,
      token: input.code,
      type: 'sms', // type is 'sms' even for WhatsApp-delivered OTPs
    })

    if (error) return { success: false, error: error.message }

    // Check if user already has a linked customer record
    // If yes: existing user, return session
    // If phone matches unclaimed customer: return claiming flow
    // If new: return needs_account flag
    return {
      success: true,
      session: data.session,
      user: data.user,
      // needsAccount / claimableCustomer determined by DB query
    }
  })
```

### TanStack AI Chat with SSE (Abstracted)

```typescript
// src/hooks/useAIChat.ts - abstraction over 0.x API
import { fetchServerSentEvents, useChat } from '@tanstack/ai-react'

interface ChatOptions {
  onError?: (error: Error) => void
}

export function useAIChat(options?: ChatOptions) {
  const chat = useChat({
    connection: fetchServerSentEvents('/api/chat'),
    onError: options?.onError,
  })

  return {
    messages: chat.messages,
    sendMessage: chat.sendMessage,
    isLoading: chat.isLoading,
    error: chat.error,
    stop: chat.stop,
    clear: chat.clear,
  }
}
```

### Rate Limiting with Cloudflare Binding + KV

```typescript
// src/lib/rate-limit.ts
// Cloudflare Rate Limiting binding for fast-path limits
// KV for 15-minute lockout after too many failed OTP verifications

interface RateLimitResult {
  allowed: boolean
  retryAfter?: number
}

// In wrangler.jsonc, add:
// "ratelimits": [
//   { "name": "OTP_LIMITER", "namespace_id": "1001", "simple": { "limit": 3, "period": 60 } },
//   { "name": "CONTACT_LIMITER", "namespace_id": "1002", "simple": { "limit": 5, "period": 60 } }
// ],
// "kv_namespaces": [
//   { "binding": "RATE_KV", "id": "..." }
// ]

export async function checkOTPRateLimit(
  env: { OTP_LIMITER: RateLimiter; RATE_KV: KVNamespace },
  phone: string
): Promise<RateLimitResult> {
  // Check KV lockout first (15-min ban)
  const lockKey = `otp-lock:${phone}`
  const locked = await env.RATE_KV.get(lockKey)
  if (locked) return { allowed: false, retryAfter: 900 }

  // Check rate limit binding
  const { success } = await env.OTP_LIMITER.limit({ key: phone })
  return { allowed: success, retryAfter: success ? undefined : 60 }
}

export async function lockOTPAfterFailures(
  env: { RATE_KV: KVNamespace },
  phone: string,
  failCount: number
): Promise<void> {
  if (failCount >= 5) {
    await env.RATE_KV.put(`otp-lock:${phone}`, '1', { expirationTtl: 900 }) // 15 minutes
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vercel AI SDK for chat | TanStack AI (0.x) | 2025 | Native TanStack Start integration, no Vercel dependency |
| KV for all rate limiting | Cloudflare Rate Limiting binding | Jan 2026 (reduced cacheTTL to 30s) | Zero-latency rate limiting, KV only for lockout state |
| Custom SSE parsing | fetchServerSentEvents from @tanstack/ai-react | 2025 | Handles reconnection, [DONE] marker, chunk parsing |
| Supabase GoTrue phone auth | signInWithOtp with channel option | Supabase v2 | WhatsApp channel support via Twilio integration |

**Deprecated/outdated:**
- `@tanstack/start` package: Frozen at 1.120.20, replaced by `@tanstack/react-start`
- `vinxi`: Removed from TanStack Start in v1.121.0
- `.validator()` on server functions: Use `.inputValidator()` instead
- `zodResolver` for RHF: Use `standardSchemaResolver` from `@hookform/resolvers/standard-schema`

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 (not yet configured) |
| Config file | none -- see Wave 0 |
| Quick run command | `bun run vitest run --reporter=verbose` |
| Full suite command | `bun run vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WEB-06 | Contact form validation (Zod) | unit | `bun run vitest run src/lib/__tests__/contact-form.test.ts -t "contact form"` | Wave 0 |
| WEB-06 | FAQ search filters items | unit | `bun run vitest run src/components/support/__tests__/faq-search.test.ts` | Wave 0 |
| WEB-10 | Phone validation regex | unit | `bun run vitest run src/lib/__tests__/auth.test.ts -t "phone validation"` | Wave 0 |
| WEB-10 | OTP input auto-advance + paste | unit | `bun run vitest run src/components/auth/__tests__/otp-input.test.ts` | Wave 0 |
| WEB-10 | Rate limit logic | unit | `bun run vitest run src/lib/__tests__/rate-limit.test.ts` | Wave 0 |
| WEB-11 | Chat abstraction hook | unit | `bun run vitest run src/hooks/__tests__/use-ai-chat.test.ts` | Wave 0 |
| WEB-12 | RTL layout + Arabic numerals | manual-only | Visual inspection in Arabic locale | N/A |

### Sampling Rate
- **Per task commit:** `bun run vitest run --reporter=verbose`
- **Per wave merge:** `bun run vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/website/vitest.config.ts` -- Vitest configuration for website app
- [ ] `apps/website/src/lib/__tests__/` -- test directory structure
- [ ] Framework install: `cd apps/website && bun add -d vitest @testing-library/react @testing-library/jest-dom` -- if none detected

## Open Questions

1. **Supabase WhatsApp OTP Provider Configuration**
   - What we know: Supabase supports WhatsApp channel via Twilio/Twilio Verify
   - What's unclear: Whether Twilio account + WhatsApp sender is already configured in Supabase dashboard
   - Recommendation: Implement code assuming Twilio is configured. Mock OTP send in development. Log a blocker if Twilio not set up by Phase 7 (portal auth).

2. **AI Chat Backend for Phase 6**
   - What we know: TanStack AI needs a server endpoint that returns SSE stream. Real AI pipeline is Phase 30.
   - What's unclear: Whether to mock AI responses or set up minimal Cloudflare AI Gateway now.
   - Recommendation: Mock SSE responses in the server function with canned responses. Real AI backend deferred to Phase 30. The abstraction layer isolates the swap.

3. **Cloudflare Worker Env Bindings Access in TanStack Start**
   - What we know: Server functions use `getRequest()` for the Request object.
   - What's unclear: How to access `env` (KV, Rate Limiter bindings) inside a TanStack Start server function on Cloudflare Workers.
   - Recommendation: Investigate `getEvent()` or similar from `@cloudflare/vite-plugin` / `cloudflare:workers` (only in server functions, never in client code). May need `import { getCloudflareContext } from '@cloudflare/vite-plugin'` or similar pattern. Test early in Phase 6 before building rate limiting.

## Project Constraints (from CLAUDE.md)

- **Three colors only:** white/black/blue #2563EB (WhatsApp green is brand exception per UI spec)
- **TanStack Start, NOT Next.js.** React Aria, NOT shadcn. Motion v12, NOT framer-motion. Bun, NOT npm.
- **`useWatch()` never `watch()`.** `.inputValidator()` not `.validator()`. Colors in `:root {}` never `@theme`.
- **`ClientOnly`** for maps. `isKeyboardDismissDisabled` on Dialogs.
- **14% VAT, Arabic-Indic numerals, Arabic unit translations -- no exceptions.**
- **Geist Mono for ALL numbers** (phone, OTP, countdown, character count).
- **Components under 800 lines.** Split before editing large files.
- **Logical properties only:** `ps-4` not `pl-4`, `me-2` not `mr-2`.
- **Dark mode:** `@custom-variant dark (...)` not Tailwind `dark:` prefix.
- **Import motion from `motion/react`** not `framer-motion`.

## Sources

### Primary (HIGH confidence)
- react-aria.adobe.com/Disclosure - Disclosure component API, props, accessibility
- react-aria.adobe.com/DisclosureGroup - Accordion pattern, expandedKeys, allowsMultipleExpanded
- supabase.com/docs/guides/auth/phone-login - Phone OTP auth flow, WhatsApp channel
- supabase.com/docs/reference/javascript/auth-signinwithotp - signInWithOtp API
- supabase.com/docs/reference/javascript/auth-verifyotp - verifyOtp API
- developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/ - Rate Limiting binding API
- developers.cloudflare.com/kv/api/write-key-value-pairs/ - KV TTL limits

### Secondary (MEDIUM confidence)
- tanstack.com/ai/latest/docs/api/ai-react - useChat API (verified via BetterStack guide)
- tanstack.com/ai/latest/docs/protocol/sse-protocol - SSE protocol details
- betterstack.com/community/guides/ai/tanstack-ai/ - Practical useChat + fetchServerSentEvents examples

### Tertiary (LOW confidence)
- Cloudflare Worker env access in TanStack Start server functions -- needs runtime validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries verified in package.json or STACK-DECISION.md
- Architecture: HIGH - follows established patterns from Phases 4-5, route structure confirmed
- Auth flow: HIGH - Supabase OTP docs are clear and stable
- AI chat: MEDIUM - TanStack AI is 0.x, API examples from third-party guide
- Rate limiting: MEDIUM - Cloudflare Rate Limiting binding is new, env access in TanStack Start unclear
- Pitfalls: HIGH - based on established React Aria, Motion, and Workers patterns

**Research date:** 2026-04-01
**Valid until:** 2026-04-30 (stable domain, 0.x TanStack AI may shift sooner)
