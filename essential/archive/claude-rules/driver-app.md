---
paths:
  - "apps/driver/**"
---

# Driver App Rules (DIFFERENT from other apps)

**Framework:** Plain Vite + React SPA + Capacitor 8. NOT TanStack Start.
**Reason:** Server functions don't work in Capacitor WebViews.

- No `tanstackStart()` or `cloudflare()` in vite.config.ts
- Shares `@hyperquote/*` packages (ui, types, i18n, forms)
- Background GPS via `@transistorsoft/capacitor-background-geolocation`
- Offline-first via PowerSync (local SQLite ↔ Supabase)
- All mutations must work offline — queue in PowerSync, sync on reconnect
- Touch targets: 56-64dp minimum (gloves, dirty screens)
- Font size: 16px base (larger than other apps for outdoor readability)
- GPS consent required before tracking (Egyptian Data Protection Law 151/2020)
