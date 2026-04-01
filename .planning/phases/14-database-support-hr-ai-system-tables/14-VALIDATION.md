---
phase: 14
slug: database-support-hr-ai-system-tables
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-02
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | psql + Supabase CLI |
| **Config file** | supabase/config.toml |
| **Quick run command** | `cd supabase && supabase db push --dry-run` |
| **Full suite command** | `supabase db reset && supabase db push` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd supabase && supabase db push --dry-run`
- **After every plan wave:** Run `supabase db reset`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 45s

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 14-01-T1 | 01 | 1 | DB-10 | smoke | `supabase db reset` | pending |
| 14-02-T1 | 02 | 2 | DB-08 | unit | `supabase db reset` | pending |
| 14-03-T1 | 03 | 3 | DB-06 | integration | `supabase db reset` | pending |
| 14-03-T2 | 03 | 3 | DB-07 | integration | `supabase db reset` | pending |
| 14-04-T1 | 04 | 4 | DB-09 | smoke | `supabase db reset` | pending |
| 14-04-T2 | 04 | 4 | DB-10 | smoke | `supabase db reset` | pending |

*Status: pending / green / red / flaky*

---

## Nyquist Compliance

**nyquist_compliant: true**

Rationale: All tasks in this phase produce SQL migration files. The automated verification command `supabase db reset` applies every migration from scratch, which validates:
- SQL syntax correctness
- FK/constraint resolution order
- Trigger function compilation (PL/pgSQL parse + reference validation)
- Materialized view query validity
- pg_cron schedule syntax
- Seed data constraint compliance (ON CONFLICT, UNIQUE, FK)

This is a sufficient automated signal for an infrastructure-only phase with no application code. Each task's `<verify>` uses `supabase db reset` which catches regressions across the full migration chain in ~45 seconds.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Business trigger cascades | DB-06 | Requires running Supabase with test data | INSERT test quote, UPDATE to accepted, verify order+POs created |
| Mat view refresh timing | DB-07 | Requires pg_cron running | Wait for scheduled refresh, verify data |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify (`supabase db reset`)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Nyquist rationale documented (SQL migration phase — `supabase db reset` is sufficient)
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
