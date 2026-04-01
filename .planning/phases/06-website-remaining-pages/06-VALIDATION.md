---
phase: 06
slug: website-remaining-pages
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (browser mode for React Aria) + Playwright 1.58.x (E2E) |
| **Config file** | `apps/website/vitest.config.ts` / `apps/website/playwright.config.ts` |
| **Quick run command** | `cd apps/website && bun test --run` |
| **Full suite command** | `cd apps/website && bun test --run && bun playwright test` |
| **Estimated runtime** | ~30 seconds (unit) + ~60 seconds (E2E) |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/website && bun test --run`
- **After every plan wave:** Run `cd apps/website && bun test --run && bun playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-xx | 01 | 1 | WEB-06 | unit+E2E | `bun test support` | ❌ W0 | ⬜ pending |
| 06-02-xx | 01 | 1 | WEB-07 | unit | `bun test docs` | ❌ W0 | ⬜ pending |
| 06-03-xx | 01 | 1 | WEB-08 | unit | `bun test legal` | ❌ W0 | ⬜ pending |
| 06-04-xx | 01 | 1 | WEB-09 | unit | `bun test careers` | ❌ W0 | ⬜ pending |
| 06-05-xx | 02 | 2 | WEB-10 | unit+E2E | `bun test login` | ❌ W0 | ⬜ pending |
| 06-06-xx | 03 | 2 | WEB-11 | unit+E2E | `bun test chat` | ❌ W0 | ⬜ pending |
| 06-07-xx | all | all | WEB-12 | E2E | `bun playwright test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test infrastructure setup (Vitest config + Playwright config if not existing)
- [ ] Test stubs for each requirement
- [ ] Shared fixtures for React Aria component testing

*If existing infrastructure already covers: update this section after plan creation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| WhatsApp OTP delivery | WEB-10 | Requires real WhatsApp/Twilio integration | Trigger OTP, verify WhatsApp message received |
| SSO cookie cross-domain | WEB-10 | Requires `.hyperquote.net` domain | Login on website, verify portal auth |
| RTL Arabic layout | WEB-12 | Visual layout verification | Switch to AR, verify all pages RTL-correct |
| Dark mode appearance | WEB-12 | Visual verification | Toggle dark mode, verify all pages |
| Mobile responsiveness | WEB-12 | Device testing | Test on mobile viewport sizes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
