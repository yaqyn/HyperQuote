---
phase: 11
slug: portal-orders-delivery-remaining-windows
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.2 |
| **Config file** | apps/portal/vitest.config.ts |
| **Quick run command** | `bun test --filter portal` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test --filter portal`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | PORT-06 | unit | `bun test --filter portal` | W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Will be expanded by planner after plans are created.*

---

## Wave 0 Requirements

- [ ] `apps/portal/src/__tests__/orders-window.test.tsx` — stubs for PORT-06 orders tabs and listing
- [ ] `apps/portal/src/__tests__/order-tracking.test.tsx` — stubs for PORT-07 tracking and GPS map
- [ ] `apps/portal/src/__tests__/notifications.test.tsx` — stubs for PORT-08 real-time notifications
- [ ] `apps/portal/src/__tests__/settings.test.tsx` — stubs for PORT-14/15/16 settings windows
- [ ] `apps/portal/src/__tests__/documents.test.tsx` — stubs for PORT-09 document access
- [ ] `apps/portal/src/__tests__/pwa.test.tsx` — stubs for PORT-12 PWA installation

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GPS map renders with driver marker | PORT-07 | MapLibre GL requires WebGL context | Open active delivery, verify map shows driver icon moving |
| PWA install prompt after 3rd visit | PORT-12 | Browser install criteria require real navigation | Visit portal 3 times, verify install banner appears |
| Push notification permission dialog | PORT-12 | Browser permission API needs user interaction | Trigger notification-worthy action, verify permission prompt |
| RTL map controls and labels | PORT-07 | Visual RTL inspection | Switch to Arabic, verify map controls mirror and labels are Arabic |
| Real-time notification arrival | PORT-08 | Requires Supabase Realtime subscription | Insert notification via DB, verify it appears without refresh |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
