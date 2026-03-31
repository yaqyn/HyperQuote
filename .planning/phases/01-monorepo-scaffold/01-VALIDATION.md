---
phase: 1
slug: monorepo-scaffold
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 (not installed yet -- greenfield Phase 1) |
| **Config file** | None -- Wave 0 creates basic build validation |
| **Quick run command** | `bun install && bun run build` |
| **Full suite command** | `bun run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** `bun install` (ensures no broken workspace links)
- **After every plan wave:** `bun run build` (all apps build successfully)
- **Before `/gsd:verify-work`:** All 4 success criteria pass manually
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | FOUND-01 | smoke | `bun install` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 2 | FOUND-04 | smoke | `bun run --filter=website dev` + curl | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 3 | FOUND-03 | integration | `bun run --filter=website preview` + curl | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Root `package.json` with workspace definitions — validates with `bun install`
- [ ] `turbo.json` with build/dev pipelines — validates with `bun run build`
- [ ] No unit test infrastructure in Phase 1 (deferred to Phase 3 when shared packages have testable logic)

*Phase 1 validates via build success and manual smoke tests (dev server starts, page renders, auth cookie works).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dev server starts and renders page | FOUND-04 | Requires browser/curl verification of SSR output | Run `bun run --filter=website dev`, visit localhost:3000, verify HTML contains server function data |
| Supabase SSR auth creates/reads cookie | FOUND-03 | Requires deployed Workers environment or wrangler dev with nodejs_compat | Run `wrangler dev` with nodejs_compat flag, hit auth endpoint, verify Set-Cookie header |
| All 5 app dev servers start | FOUND-01 | Requires 5 parallel processes | Start each app individually, verify no crash |

---

## Coverage Assessment

| Requirement | Automated | Manual | Gap |
|-------------|-----------|--------|-----|
| FOUND-01 | `bun install` ✅ | 5 dev servers ⬜ | None |
| FOUND-03 | None | Supabase SSR test ⬜ | Integration test deferred |
| FOUND-04 | `bun run build` ✅ | SSR page render ⬜ | None |
