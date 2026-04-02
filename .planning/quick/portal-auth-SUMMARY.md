---
phase: quick
plan: portal-auth
subsystem: portal, auth
tags: [auth, portal, cookies, otp, i18n]
dependency-graph:
  requires: [@hyperquote/auth, @hyperquote/i18n, @hyperquote/forms]
  provides: [portal-login-page, shared-rate-limit, cookie-domain-support]
  affects: [packages/auth/src/server.ts, apps/website/src/lib/rate-limit.ts]
tech-stack:
  added: []
  patterns: [full-page-auth, cross-subdomain-cookies, server-function-per-app]
key-files:
  created:
    - packages/auth/src/rate-limit.ts
    - apps/portal/src/routes/login.tsx
  modified:
    - packages/auth/src/server.ts
    - packages/auth/src/index.ts
    - packages/auth/package.json
    - apps/website/src/lib/rate-limit.ts
    - apps/portal/src/lib/auth.ts
    - apps/portal/src/routes/_portal.tsx
    - packages/i18n/src/locales/en/portal.json
    - packages/i18n/src/locales/ar/portal.json
decisions:
  - serializeSetCookie helper for full cookie header serialization instead of relying on framework
  - COOKIE_DOMAIN env var controls cross-subdomain sharing (opt-in, not hardcoded)
  - checkSession lightweight server fn for login page redirect check (avoids full authGuard)
metrics:
  duration: 4min
  completed: 2026-04-02
---

# Portal Auth Page Summary

Full-page login for portal with phone/OTP/account flow and cross-subdomain cookie support via Set-Cookie header serialization.

## Tasks Completed

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Update server client cookie support | 2d4aeac | cookieDomain option, serializeSetCookie helper, full Set-Cookie headers |
| 2 | Move rate-limit to shared package | c88c06f | packages/auth/src/rate-limit.ts, website re-exports from package |
| 3 | Portal auth server functions | 12a8a3c | sendOTP, verifyOTP, createAccount, claimAccount, signOut, checkSession |
| 4 | Portal login page | dd6aeb0 | Full-page glass card with 4-step flow, spring/tween animations |
| 5 | Update portal routing | b5a44ee | Local /login redirect instead of cross-app website redirect |
| 6 | Add i18n keys | dfcfb98 | 30 login.* keys in both EN and AR portal namespace |

## Deviations from Plan

### Auto-added (Rule 2)

**1. [Rule 2] Added checkSession server function**
- **Found during:** Task 3
- **Issue:** Login page needs a lightweight way to check if user is already authenticated for redirect
- **Fix:** Added `checkSession` server function that returns `{ authenticated: boolean }`
- **Files modified:** apps/portal/src/lib/auth.ts

## Known Stubs

None. All data flows are wired to server functions with dev-mode mock support.
