---
phase: 07
slug: portal-auth-shell
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (browser mode for React Aria) + Playwright 1.58.x (E2E) |
| **Config file** | `apps/portal/vitest.config.ts` / `apps/portal/playwright.config.ts` |
| **Quick run command** | `cd apps/portal && bun test --run` |
| **Full suite command** | `cd apps/portal && bun test --run && bun playwright test` |
| **Estimated runtime** | ~20 seconds (unit) + ~30 seconds (E2E) |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/portal && bun test --run`
- **After every plan wave:** Run full suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-xx | 01 | 1 | PORT-01 | unit+E2E | `bun test auth` | ❌ W0 | ⬜ pending |
| 07-02-xx | 02 | 1 | PORT-02 | unit+E2E | `bun test canvas` | ❌ W0 | ⬜ pending |
| 07-03-xx | 02 | 1 | PORT-17 | unit+E2E | `bun test window` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test infrastructure setup (Vitest + Playwright config for portal app)
- [ ] Test stubs for auth guard, canvas layout, glass windows
- [ ] Shared fixtures for portal testing

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Auth redirect to website login | PORT-01 | Cross-app redirect | Navigate unauthenticated, verify redirect to website |
| Spatial canvas visual layout | PORT-02 | Visual verification | Verify centered chat input, greeting, glass buttons |
| Glass window spring animation | PORT-17 | Animation quality | Open/close windows, verify spring enter + tween exit |
| RTL Arabic layout | PORT-02 | Visual verification | Switch to AR locale, verify all elements RTL |
| Mobile responsive layout | PORT-02 | Device testing | Test on mobile viewports |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
