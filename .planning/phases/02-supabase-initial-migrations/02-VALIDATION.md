---
phase: 2
slug: supabase-initial-migrations
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | psql + Supabase CLI |
| **Config file** | supabase/config.toml |
| **Quick run command** | `supabase db reset && psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/tests/validate.sql` |
| **Full suite command** | `supabase db reset && psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/tests/validate.sql` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | FOUND-02 | integration | `psql -c "SELECT count(*) FROM pg_type WHERE typname LIKE 'app_%'"` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | DB-02 | integration | `psql -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | DB-04 | integration | `psql -c "SELECT count(*) FROM pg_proc WHERE proname LIKE 'get_%' OR proname LIKE 'check_%'"` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | DB-02 | integration | `psql -c "SELECT count(*) FROM role_permissions"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/tests/validate.sql` — validation script for all enums, tables, functions, seed data
- [ ] Supabase local instance running via `supabase start`

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Custom access token hook fires on login | DB-04 | Requires actual auth flow | Sign in via Supabase Studio, check JWT claims |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
