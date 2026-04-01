---
paths:
  - "**"
---

# Workflow & Session Management

## Context Management (1M token window)
- You have 1M tokens. Use them. Read FULL spec sections, don't skim.
- Monitor context: long sessions drift. Start fresh sessions for new phases.
- After compaction: re-read CLAUDE.md rules (they may be lost from early context).
- Spec files (FRONTEND.md, BACKEND.md) load on demand — reading them costs context but is necessary.

## File Editing
- Read file BEFORE editing — Claude needs current state in context.
- Keep components under 800 lines. Split before editing large files.
- If edit fails ("string not found"), re-read the file and retry.
- Multiple small edits > one giant edit.

## Build Order (per feature)
1. Database migration (table + enum from BACKEND.md)
2. Server function (input/output from BACKEND.md Section 6)
3. TanStack Query hook (staleTime from BACKEND.md Section 11)
4. React component (layout from FRONTEND.md, tokens from DS.1-DS.21)
5. i18n keys (AR + EN for every user-facing string)
6. Test (Vitest for unit, Playwright for E2E)

## Testing
- `bun test` before committing
- Vitest browser mode for React Aria components (accessibility needs real browser)
- Playwright for E2E: auth → quote → order critical path
- Test Arabic locale: RTL layout, Arabic-Indic numbers, unit translations

## Git
- Atomic commits per feature (migration + function + component together)
- Branch naming: `phase-{N}/{feature-name}`
- Never force push to main

## GSD Phases
- One phase = one completable chunk of work
- Read the relevant spec sections at phase start
- Verify at phase end (does the screen work? does the API return data?)
- If blocked, move to next phase — don't spin on one issue

## Rate Limits
- Monitor `/cost` and `/usage` during long sessions
- Break work into 1-2 hour chunks
- Use Haiku for pure research/context-gathering tasks
- Sequential subagents are safer than parallel (cascade failure risk)
