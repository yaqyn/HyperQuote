# HyperQuote

A building-materials platform for Egypt, connecting customer material lists and
quote requests with sales, inventory, finance, warehouse, dispatch, and delivery.
This repository is being prepared as a portfolio demonstration of the full
workflow across four applications.

## Explore the applications

| Application | Purpose | Intended demo URL | Local URL |
| --- | --- | --- | --- |
| Website | Browse materials and build a list | [www.hyperquote.net](https://www.hyperquote.net) | http://localhost:3000 |
| Portal | Request quotes and follow customer orders | [portal.hyperquote.net](https://portal.hyperquote.net) | http://localhost:3001 |
| Internal | Manage sales, inventory, finance, warehouse, and dispatch | [internal.hyperquote.net](https://internal.hyperquote.net) | http://localhost:3002 |
| Driver | Follow assignments and record delivery outcomes | [driver.hyperquote.net](https://driver.hyperquote.net) | http://localhost:3003 |

Hosted setup is in progress. The URLs above are intended deployment addresses;
they have not yet been verified for the revived portfolio deployment. Provisioning
a database alone does not make the applications or demo logins ready.

In portfolio mode, a floating app icon expands into an app switcher and an Info
dialog with project context and fictional demo-login instructions. Local
development enables it by default; hosted builds require
`VITE_PORTFOLIO_MODE=true`. The account seed and Info dialog share
[`supabase/showcase-accounts.json`](supabase/showcase-accounts.json).

## What the project demonstrates

- Customer material lists, saved drafts, quote requests, and order tracking.
- Role-based employee workflows for sales, stock, payments, warehouse, and dispatch.
- Driver assignments, delivery progress, and delivery verification.
- English and Arabic customer surfaces, light and dark themes, and installable PWAs.
- Support conversations with email threading and permission-aware Lyon AI assistance.
- Server-enforced ownership and role boundaries, transactional business actions,
  and activity history.

External features such as AI, email, and phone OTP require their respective
provider configuration. Their presence in the source does not imply that the
hosted integrations are currently active.

## Architecture

The website, portal, and internal applications use React and TanStack Start.
The driver application uses Vite and Capacitor. Bun workspaces and Turborepo
coordinate the monorepo; shared packages provide UI, authentication, types,
internationalization, forms, and runtime helpers.

Supabase provides Postgres, Auth, and Storage. Application data passes through
server functions or API handlers that enforce account, role, and ownership
boundaries. Browser clients use Supabase Auth only; business-table access stays
behind the server boundary. The four hosted applications run on Cloudflare
Workers. Infisical supplies runtime and deployment credentials.

```text
apps/       website, portal, internal, and driver
packages/   shared UI, auth, types, i18n, and product documentation
supabase/   schema migrations, configuration, and fictional showcase data
scripts/    development, verification, and deployment tooling
```

## Run locally

Prerequisites: Bun `1.3.11`, a working Docker-compatible runtime, Supabase CLI,
and Infisical CLI. The CI workflow pins CLI versions; check its configuration
when installing tools.

1. Install dependencies with `bun install --frozen-lockfile`.
2. Log in to Infisical and link `.infisical.json` to your own project. Configure
   its `dev` environment under `/Projects/HyperQuote`; see
   `scripts/verify-infisical-env.mjs` for required provider groups.
3. Run `bun run secrets:check:dev`, then `bun run db:start`.
4. For a disposable local database, run `bun run db:reset`, followed by
   `bun run db:seed:showcase` and `bun run db:verify:showcase`.
5. Run `bun run dev` and open the local URLs above.

`db:reset` replaces local application data. Local Supabase keys come from the
local runtime; the development scripts provide them to the applications.
Production credentials must never be placed in browser-prefixed variables.
The tracked `.env.example` files explain variable names using placeholder values.

## Verification and deployment

Useful checks include `bun run check:ci`, `bun run typecheck`, `bun run test`,
and `bun run db:api-boundary`. With all four apps running,
`bun run portfolio:browser-smoke` checks login layouts and portfolio navigation.
The workflow files define the complete hosted quality gate.

Pushes to `main` run the Production workflow: checks, database migrations and
showcase initialization, Worker secret synchronization, Cloudflare rule setup,
four Worker deployments, and live smoke checks. Pull requests and other branches
run checks. Hosted deployment uses a single production environment.

## Project documentation

- [Stack and setup](STACK.md)
- [Backend boundaries and contracts](BACKEND_FLOW.md)
- [Product workflow specification](Flow.md)
- [Support email implementation](SUPPORT_EMAIL_HANDOFF.md)
- [Historical acceptance checklist](Flow.human-tasklist.md)
- [Historical verification evidence](Flow.evidence.md)

The acceptance files contain evidence from the earlier local verification run.
They are retained for traceability and do not certify the current hosted setup.
