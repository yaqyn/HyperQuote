# Quick Task: Portal Auth Page + Shared Cookies

**Goal:** Create a dedicated auth page for the portal app with the same phone→OTP→account flow as the website, sharing Supabase session cookies across both apps.

## Context

- Website auth: modal-based (LoginModal with PhoneStep, OTPStep, AccountCreation, AccountClaiming)
- Portal auth: none — redirects to website URL for login
- Both apps use `@hyperquote/auth` package for Supabase client creation
- Auth server functions (`sendOTP`, `verifyOTP`, `createAccount`, `claimAccount`, `signOut`) are in `apps/website/src/lib/auth.ts`
- Rate-limit utilities are in `apps/website/src/lib/rate-limit.ts`
- Cookie domain not explicitly set — prevents cross-subdomain sharing

## Architecture Decision

Server functions (`createServerFn`) are build-time bound to each app — they CANNOT be shared in a package. Each app needs its own server functions. Rate-limit utilities CAN be shared.

Cookie sharing: Both apps use the same Supabase project (same URL/anon key). Cookies use project ref as prefix. To share across `hyperquote.net` and `portal.hyperquote.net`, we need to set cookie domain to `.hyperquote.net`. This requires updating `createSupabaseServerClient` to pass cookie options through to `setAll`.

## Tasks

### Task 1: Update shared auth server client to support cookie domain
**File:** `packages/auth/src/server.ts`
- Add `cookieDomain?: string` to `ServerClientOptions`
- In `setAll`, serialize full `Set-Cookie` header with domain/path/etc options from Supabase
- Store serialized cookie strings in `responseCookies` Map (not just name/value)
- The `setAll` callback receives `{ name, value, options }` — pass `options` through, override domain if `cookieDomain` provided

### Task 2: Move rate-limit utilities to shared package
**Create:** `packages/auth/src/rate-limit.ts`
- Copy `apps/website/src/lib/rate-limit.ts` content
- Export from `packages/auth/src/index.ts`
- Update `apps/website/src/lib/auth.ts` to import from `@hyperquote/auth`
- Delete rate-limit functions from website (keep the file but re-export from package)

### Task 3: Create portal auth server functions
**File:** `apps/portal/src/lib/auth.ts` (extend existing)
- Add `sendOTP`, `verifyOTP`, `createAccount`, `claimAccount`, `signOut` server functions
- Same logic as website versions, importing rate-limit from `@hyperquote/auth`
- Keep existing `checkPortalAuth` function

### Task 4: Create portal login page
**File:** `apps/portal/src/routes/login.tsx`
- Full-page auth (NOT modal) with spatial glass design
- Steps: phone → OTP → account creation/claiming
- Use local `useState` for step management (no Zustand store needed)
- Use `useTranslation('portal')` namespace
- Support `?redirect=` query param for post-login redirect
- If already authenticated, redirect to `/`
- Glass card centered on page, same styling patterns as website auth components

### Task 5: Update portal routing
**File:** `apps/portal/src/routes/_portal.tsx`
- Change redirect from `${WEBSITE_URL}?login=portal&redirect=...` to `/login?redirect=...`
- Remove `WEBSITE_URL` import if no longer needed elsewhere

### Task 6: Add portal i18n keys
**File:** `apps/portal/src/locales/en/portal.json` and `ar/portal.json`
- Add login.* keys matching the auth flow (step1.heading, phoneLabel, whatsappCTA, smsFallback, step2.heading, codeSent, etc.)

## Verification
- Portal `/login` page renders with phone input
- OTP flow works (dev mode mock)
- After auth, redirects to portal home
- Unauthenticated portal access redirects to `/login`
- Cookie domain configured for cross-subdomain sharing
