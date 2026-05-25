# HyperQuote Agent Guide

Use this file for repo working rules. Use `STACK.md` for stack and backend
facts.

## Document Map

- `STACK.md` is the source of truth for stack, runtime, backend, and external
  resource policy.
- `BACKEND_FLOW.md` defines backend workflow contracts and app/server
  boundaries.
- `SUPPORT_EMAIL_HANDOFF.md` records the current support-email threading
  implementation, Resend setup, Cloudflare mail state, and activation choices.
- `Flow.md` is the product workflow spec. `Flow.evidence.md` and
  `Flow.human-tasklist.md` are generated proof/checklist artifacts.
- `packages/docs/src/content/docs/` contains customer-facing product docs, not
  repo operations policy.

## Project Shape

HyperQuote is a B2B building-materials platform for Egypt. Active apps are
`apps/website`, `apps/portal`, `apps/internal`, and `apps/driver`.

Bun workspaces and Turborepo own the monorepo. Shared packages under
`packages/` can affect every app, so broaden verification with intent. This
repo often has unrelated local work. Preserve it. Never revert, reset, delete,
or checkout away changes you did not make.

## External Resource State

HyperQuote hosted architecture is reopened as production-only. Do not create
staging, preview, or Cloudflare Pages deploy paths unless the user explicitly
reopens architecture again.

Leave the retained non-HyperQuote Cloudflare resources alone unless the user
names them directly: the `modern` Worker, `modern` R2 bucket, `modern_*`
Secrets Store entries, and `othren-assets` R2 bucket. Also leave the GitHub
repos `yaqyn/Modern`, `yaqyn/qv`, and `yaqyn/HyperQuote`.

Production deploys are source-controlled in `.github/workflows/production.yml`.
If GitHub still lists old `Deploy Staging Workers` records, treat those as
stale disabled records from old workflow files. Do not re-enable staging.

Production uses one Supabase Cloud project, `hyperquote-production`, in
`eu-west-1`. Local Supabase remains the development and proof backend.

## Backend Status And Database Policy

The backend is hardened behind an API boundary. Supabase/Postgres remains the
source of truth, but browser/native clients must not read or write public tables
or call business RPCs directly. Client apps may use Supabase Auth only for
signup, login, session refresh, and sign-out.

Use local Supabase through `supabase/` and the repo scripts for development and
proof. Production wiring goes only through the source-controlled workflow and
Infisical `prod`; do not wire apps to staging or preview backends.

Website, portal, internal, and driver data access must go through React Start
server functions, local API routes, or server-only helpers. Server code uses
`@hyperquote/auth/server` service-role helpers, and actor-sensitive RPCs must be
called through `createActorServiceRoleClient` so `service_*` wrappers receive
`p_actor_user_id` and `p_actor_pool`.

Every service-role read or write must enforce the relevant customer, employee,
driver, role, panel, or ownership boundary in the server function or service RPC
wrapper before returning data to a client.

New database migrations must not grant `anon`, `authenticated`, or `public`
access to public tables, views, sequences, or SECURITY DEFINER business
functions. If a workflow needs client access, add or reuse a server function/API
route instead of reopening table/RPC grants.

When adding a new actor-sensitive RPC, add the matching `service_*` wrapper, add
the RPC name to `ACTOR_RPC_NAMES` in `packages/auth/src/server.ts`, refresh
generated DB types, and keep `bun run db:api-boundary` passing. Do not patch
only the app call site.

Local UI-created data is disposable across `bun run db:reset`. Durable local
baseline data belongs in migrations, `supabase/seed.sql`, or an explicit seed
script. Do not treat local admin-panel records as reset-safe unless they are
backed by those files.

For database work, run the narrowest meaningful DB verification: usually
`bun run db:migrate` or `bun run db:reset`, `bun run db:types`, and
`bun run db:api-boundary`. Broaden to Supabase advisor lint and app flow tests
when grants, wrappers, generated types, or workflow transitions change.

## Working Rules

- Read named files before making claims; read nearby patterns and 1-2 analogs
  before adding modules, components, routes, stores, or scripts.
- Backend work follows `STACK.md`: Supabase/Postgres is the source of truth.
  Production is limited to the four Cloudflare Workers, the
  `hyperquote-production` Supabase project, and the production workflow. Do not
  add staging/preview, Pages, D1, Secrets Store, Vectorize, Hyperdrive, AI
  Gateway, Convex, Neon, Clerk, or another backend/deploy target unless the
  user explicitly reopens architecture.
- Supplier auth is out of scope for v1. Treat suppliers as business records
  managed by employees, not as portal/auth users.
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
- Critical workflow transitions must be enforced server-side with database
  transactions/RPC and append-only activity history. Do not rely on UI-only
  checks for order claiming, role gates, stock reservation, finance approval,
  warehouse handoff, dispatch assignment, or delivery completion.
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
  when shared packages, generated config, runtime wiring, or user-facing flows
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

- Infisical is the source of truth for local dev and production secrets. Local
  commands use the Infisical `dev` environment explicitly; production uses the
  existing `prod` slug.
- HyperQuote runtime secrets must be read only from
  `/Projects/HyperQuote`. The `/MASTER` folder is reserved for operator/admin
  credentials and must never be injected into app, Supabase, CI, deploy, test,
  or verification processes.
- Local Supabase URL, anon key, and service-role key come from local Supabase
  status during local dev. Do not store those generated local values in
  Infisical.
- Use `bun run secrets:check:dev` or `bun run secrets:check:production` before
  relying on environment-specific runtime secrets.
- Do not use Cloudflare Secrets Store. GitHub stores only scoped deploy
  credentials, including the `INFISICAL_TOKEN` production read token.
- Supabase Auth/project config is pushed manually with
  `bun run configure:supabase:production` and a transient
  `SUPABASE_ACCESS_TOKEN`; do not store that token in `/Projects/HyperQuote` or
  GitHub.
- Never print, log, paste, write, commit, or expose secrets or master tokens.
  Master credentials are for account administration only.
- Ask before destructive operations, billing changes, public repo creation,
  force-pushes, commit amends, dependency removals, workflow rewrites, database
  drops, platform resource deletion, or sending messages to shared channels.
- If a token leaks or may have leaked, stop using it, rotate it at the source,
  update Infisical, and scrub exposed copies where practical.

## Git And Local Workflow

- For commits, use `Abdulrahman M. Yaqin <Hi@Yaqin.dev>` as author and
  committer. Verify local `git config` first and set it if needed.
- Use small coherent commits when committing is part of the task. Do not commit
  exploratory, broken, or incomplete work unless asked for a checkpoint.
- After completing a requested code or config change, automatically make a
  local commit for the coherent task once relevant verification passes, unless
  the user explicitly says no commit, asks for planning/review only, or the work
  is exploratory, broken, or incomplete.
- Before auto-committing, inspect `git status` and the staged diff. Stage only
  the files that belong to the completed task. If unrelated dirty work exists,
  leave it unstaged unless the user said `commit all`, `clean`, or equivalent.
- If unrelated dirty work is discovered while starting a new task, do not mix it
  into the new task. If it is clearly a completed and verified prior agent
  change, commit it separately first. If it is user/unknown work, incomplete, or
  unverified, leave it unstaged unless the user explicitly asks to commit all.
- Do not auto-push. Pushing still requires an explicit user request.
- Do not add Codex, AI, generated-by, co-author, or agent attribution to
  commits, PRs, releases, or project files unless explicitly asked.
- Do not amend commits, skip hooks, force-push, hard reset, checkout away work,
  delete branches/files, or create GitHub repos unless explicitly asked.
- There is no staging deploy path. If the user says "push to staging", stop and
  design the workflow first.
- Pushing to `main` is a source-control action that triggers the production
  workflow after checks. Do not auto-push. Do not imply Cloudflare Pages,
  staging, preview, or Supabase cloud changes outside the production workflow.
- Use `bun run db:start` / `bun run db:reset` and `bun run dev` as the operating
  path. Use local verification scripts before committing.

## When To Ask

Ask before implementing when a business word maps to an unconfirmed workflow, a
name can refer to more than one surface, the change adds an implicit side
effect, or you cannot describe the user's context in one sentence.

The codebase is not the spec. The workflow is.
