---
phase: 08
slug: portal-ai-chat
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 08 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (browser mode for React Aria) |
| **Config file** | `apps/portal/vitest.config.ts` |
| **Quick run command** | `cd apps/portal && bun test --run` |
| **Full suite command** | `cd apps/portal && bun test --run` |
| **Estimated runtime** | ~20 seconds |

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
| 08-01-xx | 01 | 1 | PORT-03 | unit | `bun test chat` | ❌ W0 | ⬜ pending |
| 08-02-xx | 02 | 1 | PORT-03 | unit | `bun test rich` | ❌ W0 | ⬜ pending |
| 08-03-xx | 03 | 2 | PORT-03 | unit | `bun test slash` | ❌ W0 | ⬜ pending |

---

## Wave 0 Requirements

- [ ] Test stubs for streaming, rich messages, slash commands
- [ ] Shared fixtures for portal chat testing

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SSE streaming visual | PORT-03 | Token-by-token visual | Send message, verify streaming appearance |
| Rich card rendering | PORT-03 | Visual verification | Trigger product card, verify layout |
| Conversation history overlay | PORT-03 | Visual + interaction | Open history, verify past conversations |
| RTL chat layout | PORT-03 | Visual verification | Switch to AR, verify bubble alignment |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity
- [ ] Wave 0 covers all MISSING references
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
