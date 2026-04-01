# Phase 6: Website Remaining Pages

## Goal
Website is complete with all content pages, authentication flow, and AI chat widget.

## Dependencies
Phase 5 (Website Market + Product Detail must be complete).

## Requirements

- **WEB-06**: Support page: contact form (anonymous) + FAQ accordion, two-tier (anonymous vs logged-in)
- **WEB-07**: Docs page: skeleton layout with sidebar TOC, 2-3 example sections
- **WEB-08**: Legal pages: privacy policy + terms of use (Arabic legally binding, English translation notice)
- **WEB-09**: Careers page: job listings or "Send us your CV"
- **WEB-10**: Login modal: phone OTP (WhatsApp primary, SMS fallback) -> verify -> account creation (4 fields) or account claiming (masked hint)
- **WEB-11**: AI chat widget: floating button -> mini chat panel, streaming responses via SSE, inline product cards and action buttons
- **WEB-12**: All pages SSG or SSR as specified, responsive mobile, RTL Arabic, dark mode

## Success Criteria
1. Login modal completes full flow: phone input -> WhatsApp OTP -> verify -> account creation (4 fields) or account claiming (masked hint)
2. SSO cookie is set on `.hyperquote.net` domain after successful login
3. AI chat widget opens from floating button, streams responses via SSE, and shows inline product cards
4. Support page accepts anonymous contact form submissions, FAQ accordion expands/collapses
5. All pages are responsive on mobile, work in RTL Arabic, and support dark mode

## What to Build
- Support page: contact form (anonymous) + FAQ accordion
- Docs page: skeleton layout with sidebar TOC
- Careers page: job listings
- Legal pages: privacy policy + terms (from brand/legal/)
- Login Modal: phone input -> WhatsApp OTP -> verify -> PIN setup -> account creation. Elevated glass overlay.
- AI Chat Widget: floating button -> mini chat panel
- Server functions: `sendOTP()`, `verifyOTP()`, `createAccount()`, `submitContactForm()`

## Spec References

### Server Functions (from BACKEND.md Section 6 — Auth + Website)

**Auth functions (used by Login Modal):**

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `sendOTP` | POST | `{ phone, method: 'whatsapp'\|'sms' }` | `{ success, expiresIn }` | none | WhatsApp/SMS via carrier-routed provider |
| `verifyOTP` | POST | `{ phone, code }` | `{ session, user }` | none | Creates/returns Supabase session |
| `createAccount` | POST | `{ phone, company, contactName }` | `{ customerId, userId }` | none | Creates `customers` + `auth.users` records |

**Website function (used by Support page contact form):**

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `submitContactForm` | POST | `{ name, email, phone?, subject, message }` | `{ ticketId }` | none | Insert ticket, notify support |

**Additional Auth functions (account claiming + sign out):**

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `claimAccount` | POST | `{ phone, otp }` | `{ customerId, claimed }` | authenticated | Links `auth.users` to existing customer |
| `signOut` | POST | `{}` | `{ success }` | authenticated | Clears SSO cookie, revokes session |

**Rate Limiting Implementation (OTP & Contact Form):**

OTP rate limiting is critical to prevent brute force. Implement at the server function level using Cloudflare KV as a counter:

```
Key pattern: rate:{phone}:{action}
TTL: 60 seconds (sliding window)
Limits:
  - sendOTP: 3 attempts per phone per 60 seconds
  - verifyOTP: 5 attempts per phone per 60 seconds (then lock for 15 minutes)
  - submitContactForm: 5 per IP per 60 seconds

Implementation:
1. Server function reads KV counter for the key
2. If count >= limit, return 429 with retry-after header
3. If count < limit, increment counter with TTL
4. On successful verifyOTP, delete the counter key
```

### PIN Setup Clarification

**The website Login Modal does NOT include PIN setup.** The FRONTEND.md spec for section 1.9 (Login Modal) has 3 steps only: Phone input -> OTP verification -> Account creation. No PIN step.

PIN setup exists in the **Driver App** (Phase 24) -- drivers use biometric (primary) -> 6-digit PIN (fallback) -> OTP (last resort). The portal also uses PIN for returning users (set up during first portal login, not during website signup).

The phase-06 "What to Build" section previously listed "PIN setup" in the Login Modal flow -- this is incorrect. The website login flow is: phone -> OTP -> account creation (3 fields: phone auto-filled, company name, full name). That's it.

### 1.6 Support Page

**Route:** `/support` | **Rendering:** SSR

**Two-tier:** Anonymous = contact form + FAQ. Logged-in = portal redirect + form fallback.

**Help heading:** "How can we help?" Inter 700 30px. SearchField (fuse.js filters FAQ).

**3 contact option cards:**
1. WhatsApp (primary): MessageCircle icon green, "Chat on WhatsApp" green button -> wa.me link
2. Email: Mail icon blue, "support@hyperquote.net" mailto link
3. Phone: Phone icon blue, phone number in Geist Mono, tel: link

**Contact form (anonymous):** React Hook Form + Zod. Fields: Name (required), Email (required, Zod .email()), Phone (optional, Egyptian regex), Subject (React Aria Select), Message (TextArea, min 10 / max 2000 chars, character count in Geist Mono). "Send Message" button. On success: checkmark + "Thank you!" confirmation.

**FAQ accordion:** React Aria `Disclosure` group. 10-15 items. ChevronDown rotates 180deg on open. Search from heading filters FAQ items.

### 1.7 Legal Pages

**Routes:** `/legal/privacy`, `/legal/terms` | **Rendering:** SSG

Max-width 800px. Rendered markdown. Arabic is legally binding; English version shows translation notice in blue info banner. Language toggle at top.

### 1.8 Docs Page (Skeleton)

**Routes:** `/docs`, `/docs/{section-slug}` | **Rendering:** SSG

2-column: Sidebar nav (React Aria ListBox, 256px) + content area. Skeleton content with placeholder sections. Mobile: sidebar becomes bottom sheet.

**Sidebar navigation sections and example pages (from FRONTEND.md 1.8):**
- **"Getting Started"**: "What is HyperQuote?", "Creating an Account", "Your First Quote"
- **"Using the Portal"**: "Building Material Lists", "Tracking Orders", "Managing Projects"
- **"For Suppliers"**: "Publishing Your Catalog", "Managing Prices", "Handling POs"

**Sidebar styling:** Sticky, top 80px. Background `var(--color-surface)`. Rounded-xl on desktop. Navigation tree: React Aria `ListBox` with sections. Section heading: Inter 600 12px `var(--color-text-subtle)`, uppercase, mb-8px. Each link: Inter 400 14px `var(--color-text-muted)`. Active: `var(--color-primary)`, font-weight 500, 2px inline-start border blue.

**Content area:** Prose styling identical to legal pages. Table of contents (on-page): right sidebar (inline-end, 200px) on wide screens (> 1440px). Lists h2/h3 anchors. Active section highlighted via IntersectionObserver. Inter 400 12px.

### 1.9 Login Modal

**Not a page -- modal overlay triggered from any page.**

**Triggers:** "Get a Quote" CTA click, "Add to Quote" click, portal auth redirect.

**Modal container:** React Aria `Modal` + `ModalOverlay`. `isDismissable={true}`. Black 50% overlay with backdrop-blur(4px). Modal: var(--color-card) bg, rounded-2xl, max-width 440px, shadow-xl. Spring enter (scale 0.95->1), tween exit. Focus trapped.

**Step 1 -- Phone number:**
- "Sign In" heading, Inter 700 24px.
- Fixed "+20" prefix with Egyptian flag.
- Phone input: React Aria TextField, type tel, Geist Mono. Validation: 10 digits, starts with 10/11/12/15.
- "Continue with WhatsApp" button: green bg, white text, MessageCircle icon. Calls `sendOTP({ phone, method: 'whatsapp' })`.
- "Send via SMS instead" fallback link.

**Step 2 -- OTP verification:**
- "Verify Your Number" heading.
- 6 individual digit boxes (48px square, Geist Mono 20px). Auto-advance, paste support. Auto-submit on 6 digits.
- Wrong code: shake animation, clear boxes, error text.
- Resend after 30s countdown (Geist Mono).
- Existing user: close modal, set SSO cookie, refresh. New phone: go to Step 3.

**Step 3 -- Account creation (new users):**
- "Create Your Account" heading.
- Company name (required), Full name (required).
- "Create Account" button: blue bg.
- On success: SSO cookie set, modal closes. Redirect to portal if "Get a Quote" triggered.

**Account claiming (phone matches unclaimed customer):**
- "We found an existing account" screen.
- Masked company hint: "A**** C****".
- "Yes, that's me" (claims account, skips Step 3) or "No, create a new account" (proceeds to Step 3).

### 1.10 Careers Page

**Route:** `/careers` | **Rendering:** SSG. Max-width 800px. Job listing cards or "Send us your CV" email link.

### 1.11 AI Chat Widget

**Present on ALL website pages. Floating bottom-right (bottom-left in RTL).**

**Collapsed:** 56px circle, blue bg, white MessageSquare 24px. Shadow-lg. Hover: scale(1.05). Pulse badge for first-time visitors.

**Expanded:** 380px width, 520px max-height. var(--color-card) bg, rounded-2xl, shadow-2xl.
- Header: 48px, logo + "HyperQuote" + close button.
- Chat area: AI bubbles (surface bg, rounded-xl) + user bubbles (blue bg, white text). Streaming via SSE (@tanstack/ai-react `useChat`). Typing indicator: 3 dots.
- Input: React Aria TextField, auto-grow. Send button: 36px blue circle.
- AI can suggest actions inline (e.g., "Add to Quote" button within message bubble).
- Not-logged-in: general questions work. Quote actions prompt "Sign in first" with inline button.
- Mobile: full-screen bottom sheet (100vw, 70vh).

### Arabic Legal Bindingness

Arabic is the legally binding version for all legal pages under Egyptian law. This is based on:
- **Egyptian Civil Code** and commercial law require Arabic as the official language of contracts and legal documents.
- **Egyptian E-Signature Law 15/2004** governs electronic documents and signatures -- all legally binding digital documents must have an Arabic version.
- The English version is a **convenience translation only** and must display a blue info banner at the top stating: "This is a translation. The Arabic version is the legally binding document." / "هذه ترجمة. النسخة العربية هي الوثيقة الملزمة قانونياً."
- Language toggle at top of legal pages allows switching between AR and EN.

### Egyptian Business Context

**OTP delivery:** WhatsApp primary, SMS fallback after 30s, voice after 60s.
**Carrier detection:** +20 10x = Vodafone, +20 11x = Etisalat, +20 12x = Orange.
**SSO cookie:** Set on `.hyperquote.net` domain -- login on website = logged in on portal.
**Work week:** Sunday-Thursday. Weekend: Friday + Saturday.

### Additional Spec Details (Gap Fills)

**Contact form phone validation:**
- Phone validation regex: `/^\+?20[0-9]{10}$/` or international format.

**Submit button dimensions:**
- "Send Message" button: blue bg, white text, full width max 400px, height 48px, rounded-lg.

**FAQ search non-matching behavior:**
- Non-matching items fade to opacity 0.3 and get `aria-hidden`.

**Loading state details:**
- FAQ skeletons: 6 items (line + expanded area shimmer). Contact form skeleton: 5 field skeletons.

**Contact form field heights:**
- All contact form fields: height 44px (Name, Email, Phone, Subject, Message excluded — TextArea uses 4 rows min).

**Legal title and date styling:**
- Title: Inter 700 30px. Last updated date: Geist Mono 12px `var(--color-text-muted)`.

**Legal markdown typography:**
- h2: Inter 600 20px, mt-32px mb-16px. h3: Inter 600 16px, mt-24px mb-12px. Paragraphs: Inter 400 16px, line-height 1.75, mb-16px.

**Login modal spring config:**
- Spring enter: scale 0.95 → 1, opacity 0 → 1, stiffness 260, damping 20. Tween exit: opacity 1 → 0, 150ms.

**OTP input inputmode:**
- Each OTP box: type tel, maxlength 1, `inputmode="numeric"`.

**Account creation max lengths:**
- Company name: max 200 chars. Full name: max 100 chars.

**Legal agreement text:**
- Below create account button: "By creating an account, you agree to our [Terms of Use] and [Privacy Policy]." — Inter 400 11px `var(--color-text-subtle)`. Links are `var(--color-primary)`, open in new tab.

**Careers card styling:**
- Each card: bg `var(--color-card)`, rounded-xl, p-24px, mb-16px, border 1px `var(--color-border)`. Location: Inter 400 14px muted (e.g., "Cairo, Egypt · Full Time").

**AI chat bubble corners:**
- AI bubbles: rounded-tl-sm (rounded-tr-sm in RTL). User bubbles: rounded-tr-sm (rounded-tl-sm in RTL).

**AI chat send button RTL:**
- Send button: Lucide `Send` 16px, flipped 180deg in RTL.

**Unread pulse badge:**
- Small green dot (10px) at top-right of button, with a single pulse animation on mount (not continuous).

**Mobile AI panel input:**
- Input has 56px height for touch targets.

## Non-Negotiable Rules
1. **Login is a Modal overlay, NOT a page redirect.**
2. **OTP primary: WhatsApp. Fallback: SMS after 30s. Voice after 60s.**
3. **SSO cookie on `.hyperquote.net`** -- login on any app = logged in on all apps.
4. **React Aria Components** for all interactive elements (Modal, TextField, Select, TextArea, Disclosure).
5. **Geist Mono** for phone numbers, OTP digits, countdown timers, character counts.
6. **Arabic-Indic numerals** in Arabic context.
7. **`useWatch()`, NEVER `watch()`** for React Hook Form.
8. **`.inputValidator()`, NOT `.validator()`** for server functions.
9. **AI chat never auto-submits.** Every action needs user confirmation.
10. **AI never reveals supplier costs, margin data, or internal pricing.**

## Known Risks & Gotchas

### Login Flow Complexity
- Account claiming flow (matching unclaimed customer by phone) is a separate code path.
- OTP rate limiting is critical -- prevent brute force.
- SSO cookie must be set on `.hyperquote.net` domain for cross-app auth.

### AI Chat Widget
- TanStack AI packages (@tanstack/ai, @tanstack/ai-react) are 0.x -- wrap behind abstraction.
- SSE streaming needs proper error handling and AbortController cancellation.
- Rate limit: 30 messages/minute.

### Legal Pages
- Arabic version is legally binding per Egyptian law. English is convenience translation.
- Must display translation notice on English version.

## Tips
- Login is a Modal overlay, NOT a page redirect
- OTP primary: WhatsApp. Fallback: SMS after 30s. Voice after 60s.
- Carrier detection: +20 10x = Vodafone, +20 11x = Etisalat, +20 12x = Orange
- Contact form shows ALL field errors at once, never fail on first error
- FAQ accordion search filters items client-side with fuse.js
- Legal pages: Arabic is legally binding, English shows translation notice banner
- AI chat widget: first message auto-sent on open for new visitors
