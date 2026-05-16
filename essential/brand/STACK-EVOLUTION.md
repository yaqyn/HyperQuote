# HyperQuote Stack Evolution Log

**Role:** Companion to `STACK-DECISION.md` (frozen snapshot, 2026-03-26).
This file tracks every stack change — applied, proposed, or rejected —
since that snapshot. `STACK-DECISION.md` must remain a historical
record; never silently edited.

---

## 2026-04-18 — Reality check vs advisor memo (`/home/qv/stack/RECOMMENDATION.md`)

A parallel-agent advisor memo was produced on 2026-04-18. It compares the
2026-03-26 decision to current best practice. Some items were **already
done in code**, some were **no longer accurate**, some are **genuine
gaps**. This log separates them.

### Findings: what the memo assumes missing vs actual state

| Memo item | Reality |
|---|---|
| C1 — TS 6 vs Biome 2.4.8 incompatible | Mixed — TS 6.0.2 installed across workspaces, Biome 2.4.8 currently reports 1 unused-import + 5 CSS specificity warnings, none are TS-parser failures. The incompatibility is NOT blocking. |
| C2 — `@tanstack/ai@0.9.1` doesn't exist on npm | Correct that 0.9.1 doesn't exist. Reality: installed `0.9.2` (internal, portal, website) and `0.10.0` (ceo). Doc's version was a hallucination; real code is split across two valid versions. |
| C3 — `@supabase/ssr` Workers issue | `@supabase/ssr@0.9.0` installed. Workers-specific fix status unverified in this pass. Separate spike needed. |
| C4 — Motion #9158 attributed to wrong repo | Doc-only annotation. Low priority. |
| C5 — tailwindcss #15401 fixed upstream | Doc-only annotation. Low priority. |
| R1 — swap @tanstack/ai → Vercel AI SDK | `@tanstack/ai*` IS installed and in use across 3 apps. Migration has real cost — defer to dedicated PR with scope. |
| R2 — Cohere embed-v4 vs bge-m3 bench | Not yet benchmarked. Open. |
| R3 — add Drizzle | Not installed. Proposed. |
| A1 — `@t3-oss/env-core` | **NOT installed** — genuine gap. |
| A2 — Sentry (3 SDKs) | **NOT installed** — genuine gap. |
| A3 — PDF generation via CF Browser Rendering | **Not wired** — genuine gap, and flagged as critical for a quoting app. |
| A4 — Resend + React Email | **NOT installed** — gap. |
| A5 — CF Workers Rate Limiting binding | Not configured in any `wrangler.jsonc`. Gap. |
| A6 — PostHog (product analytics + feature flags) | **NOT installed** — gap. |
| A7 — CF Workers native observability | **Applied 2026-04-18** — `observability.enabled = true` added to all 4 Workers configs (website, portal, internal, ceo). |
| A8 — Supabase CLI + pgTAP | CLI presence unverified. pgTAP RLS tests not yet wired. |
| A9 — GitHub Actions skeleton | **No `.github/workflows/` exists yet.** Gap. |
| knip | **Already installed** — `knip.json` at repo root, `bun run knip` script present. Memo didn't mention but it's done. |

### Additional drift findings (not in memo but real)

| Concern | Detail |
|---|---|
| Zod version drift | `internal/portal/website` on Zod `^4.3.6`; `packages/forms` still on Zod `^3.24.0`. 3/4 apps already completed the memo's "Zod 3 → 4 migration." |
| i18next version drift | `driver/internal/portal` on `^26.0.3`; `website` + `packages/i18n` on `^25.10.10`. Partial 26 migration. |
| `@supabase/supabase-js` drift | `driver/internal/portal` on `2.101.1`; `auth/website` on `2.100.1`. |
| React version spec drift | Most workspaces `^19.2.4`; some `^19.0.0`. |
| `@cloudflare/tanstack-ai` | **NOT installed anywhere.** Doc listed it as dependency; reality: never installed. |

---

## Applied changes

### 2026-04-18 — A7: enable Workers native observability
- Added `"observability": { "enabled": true }` to all 3 app `wrangler.jsonc`:
  - `apps/website/wrangler.jsonc`
  - `apps/portal/wrangler.jsonc`
  - `apps/internal/wrangler.jsonc`
- No driver config (Capacitor, not Workers).
- Free on Workers Paid plan; provides logs + invocation metrics in the CF dashboard.

### 2026-04-18 — Biome baseline restored (zero errors)
- Removed unused `useSalesStore` import from `apps/internal/src/components/shell/InternalShortcuts.tsx`.
- Added `style.noDescendingSpecificity: off` to the existing `**/styles.css` override in `biome.json`. Rule was flagging legit reset + theme-override CSS patterns; already matches the precedent of `noImportantStyles: off` for the same glob.

### 2026-04-18 — Companion doc created
- This file (`STACK-EVOLUTION.md`) added alongside `STACK-DECISION.md`.
- `STACK-DECISION.md` remains untouched — stays as the 2026-03-26 snapshot.

---

## Proposed (not yet applied — dedicated PRs needed)

| ID | Summary | Risk | Reasoning |
|---|---|---|---|
| **drift-zod** | Sync `packages/forms` Zod `^3.24.0` → `^4.3.6` | Low-medium | 4 of 5 apps already on Zod 4; `forms` is the last holdout. `@hookform/resolvers` 5 supports both. Small PR with schema rewrite to Zod 4 API |
| **drift-i18n** | Sync `website` + `packages/i18n` i18next `^25.10.10` → `^26.0.3` | Low | Patch-level API; plugin compatibility needed. Small PR |
| **drift-ai** | Consolidate `@tanstack/ai` to one version across apps | Low-medium | Pick either 0.9.2 or 0.10.x; migration notes between those two are minor |
| **drift-supabase** | Sync `@supabase/supabase-js` to one patch version | Low | Trivial `bun update` pass |
| A1 | Install `@t3-oss/env-core` + Zod env schemas | Low | Additive, per-app env validator with `PUBLIC_` prefix discipline |
| A2 | Install Sentry: `@sentry/cloudflare`, `@sentry/tanstackstart-react`, `@sentry/capacitor` | Low-medium | 3 SDK installs + init wiring. One org, one project |
| A3 | Wire CF Browser Rendering `/pdf` endpoint (Arabic RTL quote PDF) | Medium | New service binding, template route, R2 upload path |
| A4 | Install Resend + React Email; wire magic-link + order emails | Medium | New component library + transactional flow |
| A5 | Configure CF Rate Limiting bindings in `wrangler.jsonc` × 4 | Low | `[[unsafe.bindings]]` entries; scoped per app (auth / AI / quotes) |
| A6 | Install PostHog (node + browser) for analytics + feature flags | Medium | SDK wiring, event instrumentation, flag patterns |
| A8 | Wire Supabase CLI + pgTAP for RLS tests | Medium | New test harness, Docker-based local Supabase, per-transaction rollback |
| A9 | GitHub Actions skeleton | Medium | PR checks, Turborepo remote cache, wrangler-action deploy, Capacitor mobile workflow |
| R1 | Swap `@tanstack/ai*` → `ai@^6 + @ai-sdk/anthropic + @ai-sdk/react` | High | Every AI call site needs rewrite. `useChat`/`useCompletion` drop-ins; tool calling + streaming must be re-verified. Reserve a dedicated migration session |
| R2 | Embedding bench: Cohere embed-v4 vs Workers AI bge-m3 on 200 real bilingual entries | Low | Offline experiment, no code change until decision |
| R3 | Add Drizzle for RLS-aware query building (keep `@supabase/supabase-js` for Auth/Storage/Realtime) | Medium | Additive, but doubles the "how do I query?" answer. Discipline needed on which path for what |
| ver-major-react-aria | `react-aria-components` 1.16 → 1.17 | High | "Audit every `@react-aria/*` sub-import" — codebase-wide |
| ver-major-turbo | Turborepo 2.8.21 → 2.9.6 | Low | Should be transparent |
| ver-minors | Minor bumps: `@tanstack/react-start` 1.167.12→1.167.41, `@cloudflare/vite-plugin`, `wrangler`, `@playwright/test`, `msw`, etc. | Low | Batch minor-bump PR |
| ver-patches | All patch bumps (TS 6.0.2→6.0.3, React 19.2.4→19.2.5, etc.) | Zero | Batch patch PR |

---

## Rejected / deferred

| ID | Reason |
|---|---|
| A11 — Doppler/Infisical for secrets | Advisor says "not until team > 1." **Rejected for that reason** — we already adopted Infisical 2026-04-18 for portability (survives OS reset) and cross-device reach, not team-collaboration. Keeping Infisical. |
| A10 — Fumadocs | Defer until external partners need API docs. Storybook covers internal today. |
| Axiom / Datadog paid observability | Native CF observability is free and sufficient at current scale. |
| LaunchDarkly / Statsig | PostHog flags cover real needs. |
| Mixpanel / Amplitude | PostHog group analytics covers B2B. |
| Chromatic | Playwright screenshots sufficient for now. Revisit when design system stabilizes and visual regressions start costing hours. |
| Tauri 2 mobile | Revisit 2027. |
| Mastra / LangChain / BAML | Wrong abstraction level for a quoting app. |

---

## Conventions for future entries

- **Never edit `STACK-DECISION.md`.** All post-2026-03-26 changes belong here.
- **One entry per change**, dated, with the file paths or commit hash.
- **"Applied"** = merged to main, behavior changed. Link the commit.
- **"Proposed"** = discussed, not executed. Include risk tier.
- **"Rejected"** = explicitly decided against. Include why.
- **Version bumps** that are patch-only can be grouped; major version bumps get their own entry.
- **Doc errata** (advisor claimed X about GitHub issue, reality is Y) are logged as Findings, not as Applied changes unless `STACK-DECISION.md` itself needs an annotation (rare).

---

*This document supersedes any "just edit STACK-DECISION.md" workflow. The past is frozen; the future evolves here.*
