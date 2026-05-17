# HyperQuote Agent Guide

Use this file for repo working rules. Use `STACK.md` for stack/deploy/backend facts.

## Project Shape

HyperQuote is a B2B building-materials platform for Egypt. Active apps are
`apps/website`, `apps/portal`, `apps/internal`, and `apps/driver`.

Bun workspaces and Turborepo own the monorepo. Shared packages under
`packages/` can affect every app, so broaden verification with intent. This
repo often has unrelated local work. Preserve it. Never revert, reset, delete,
or checkout away changes you did not make.

## Working Rules

- Read named files before making claims; read nearby patterns and 1-2 analogs
  before adding modules, components, routes, stores, or scripts.
- Make the smallest coherent root-cause change. Do not refactor unrelated code.
- Treat user reactions as signal. If the request changes instructions, stack,
  architecture, defaults, workflow, or UX direction, state the concern,
  tradeoff, and recommended move before editing unless it is a narrow
  mechanical correction.
- Ask only when ambiguity affects product behavior, data safety, cost, external
  side effects, or shared resources.
- Do not hardcode user-facing data: names, prices, addresses, labels, statuses,
  IDs, or dates. Allowed inline constants are static website brand/legal content
  and genuinely fixed config values.
- Dev mode may use existing adapters: internal uses
  `apps/internal/src/lib/db/db.ts` plus seed markdown; driver uses its local
  repository layer. Keep caller contracts stable.
- User-facing components should handle loading, error, and empty states when
  those states can occur.

## Bug Fix Discipline

- Treat every bug as a pattern until proven otherwise. Fix the observed issue,
  then search similar forms across source, generated output, tests, scripts,
  config, and staged artifacts.
- Patch the source or generator that produces bad behavior, not only the
  produced artifact.
- Add regression guards for the bug class when practical.
- If generated or staged files are involved, verify the final output directly.
- If another variant appears after a fix, broaden the search and guard instead
  of repeating one-off patches.

## Code Quality

- Avoid `any`; avoid `as` casts unless unavoidable and explain why nearby.
- Leave no placeholder code, TODOs, dead code, unused imports, commented-out
  blocks, or stray debug logs.
- Use existing framework and local helper patterns before adding abstractions.
- No raw HTML injection in React. The only existing exceptions are JSON-LD and
  the root pre-hydration boot script with targeted Biome overrides.
- For bilingual website, portal, and driver surfaces, use i18n resources and
  logical CSS properties. Internal is EN-only unless a local namespace exists.
- Keep cleanup in the same session for reshaped code: duplicated helpers,
  abandoned components, stale types, old store keys, and unused mocks get
  removed now.

## Verification

- Format/lint with repo scripts first. `bun run check:ci` is read-only;
  `bun run check` writes Biome fixes.
- Run the narrowest meaningful verification after each coherent change. Broaden
  when shared packages, generated config, deploy wiring, or user-facing flows
  are affected.
- Shell/config changes need `bash -n`, `shellcheck`, and the narrowest
  practical runtime check.
- Broad cleanup, dependency, or architecture work should use the scanner stack:
  `check:ci`, `typecheck`, Knip, Syncpack, architecture, duplicate, secret,
  vulnerability, Semgrep scans, and `git diff --check`.
- Classify scanner output before fixing. If a tool reports huge noise, inspect
  paths first; generated/vendor files usually slipped through excludes.
- `scan:duplicates` can exit 0 while still reporting active-code clones. Treat
  it as classification input.
- Type-checking is not tests passing. Compiling is not proof of a UI flow.
- Do not say "done", "fixed", "works", "passing", or "shipped" unless the
  relevant verification ran in this turn and passed. Report checks that did not
  run and why.
- Do not build after every edit. Run app builds after completed features or
  when asked. Dev ports: website `3000`, portal `3001`, internal `3002`,
  driver `3003`.

## Security And Credentials

- Prefer authenticated `gh`, `wrangler`, and `infisical` sessions; prefer
  Infisical over raw token env vars.
- Never print, log, paste, write, commit, or expose secrets or master tokens.
  Master credentials are for account administration only. Use scoped project
  credentials for routine runtime, CI, and deploy work.
- Ask before destructive operations, billing changes, public repo creation,
  force-pushes, commit amends, dependency removals, CI rewrites, database
  drops, platform resource deletion, or sending messages to shared channels.
- If a token leaks or may have leaked, stop using it, rotate it at the source,
  update Infisical, and scrub exposed copies where practical.

## Git And Deploy

- For commits, use `Abdulrahman M. Yaqin <Hi@Yaqin.dev>` as author and
  committer. Verify local `git config` first and set it if needed.
- Use small coherent commits when committing is part of the task. Do not commit
  exploratory, broken, or incomplete work unless asked for a checkpoint.
- Do not add Codex, AI, generated-by, co-author, or agent attribution to
  commits, PRs, releases, or project files unless explicitly asked.
- Do not amend commits, skip hooks, force-push, hard reset, checkout away work,
  delete branches/files, or create GitHub repos unless explicitly asked.
- "Push to staging" means verify, commit if needed, push through GitHub, and
  let `main` trigger the staging workers.
- "Push to production" means trigger the manual production workflow for an
  already-staged `source_sha` and selected `target_app`.
- Do not deploy independently with local Wrangler/Infisical unless explicitly
  asked for a local deploy/admin action.

## When To Ask

Ask before implementing when a business word maps to an unconfirmed workflow, a
name can refer to more than one surface, the change adds an implicit side
effect, or you cannot describe the user's context in one sentence.

The codebase is not the spec. The workflow is.
