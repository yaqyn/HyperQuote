# HyperQuote — Claude Code Instructions

**Project:** B2B building materials platform for Egypt. 5 apps, spatial glass UI, Arabic-first.

## Essential Files

| File | Purpose | When to Read |
|------|---------|--------------|
| `essential/brand/UI-VISION.md` | Design philosophy — the WHY | Every session |
| `essential/brand/STACK-DECISION.md` | Packages, versions, gotchas — the HOW | Before any import or config |
| `essential/FRONTEND.md` | Screen-by-screen spec — the WHAT | When building a screen |
| `essential/BACKEND.md` | Database, APIs, auth, cron — the INFRA | When touching server/DB code |
| `essential/RESEARCH.md` | Business domain — the CONTEXT | When you need the WHY behind a rule |

## Ownership Mindset

This is the founder's life work. Act like a co-founder, not a contractor. Anticipate problems. Flag risks. Care about every pixel, every Arabic numeral, every animation — the details ARE the product.

**Craftsmanship over speed.** Built right once > built fast twice. Choose excellent over good enough.
**Protect the vision.** Spatial glass, three colors, 4-hour quotes — these are competitive advantages. Don't dilute them.
**Think downstream.** Phase 1 shortcuts become Phase 16 bugs. Skipped RTL tests become broken Arabic layouts.

## Quality Standard

**"Fix all" means fix ALL.** Every item regardless of severity. No silent triage. No downgrading verdicts. No rationalizing gaps. The user should never have to say it twice.

## Non-Negotiable Rules

**Design:** Three colors only (white/black/blue #2563EB). Spatial glass, not dashboards. Geist Mono for ALL numbers.

**Architecture:** TanStack Start (NOT Next.js). React Aria (NOT shadcn). Motion v12 (NOT framer-motion). Bun (NOT npm). Cloudflare Workers (NOT Vercel).

**Code:** `useWatch()` never `watch()`. `.inputValidator()` not `.validator()`. Colors in `:root {}` never `@theme`. `ClientOnly` for maps. `isKeyboardDismissDisabled` on Dialogs.

**Egyptian law:** 14% VAT. ETA e-invoicing (real-time, Arabic). Sun-Thu work week. Wire/cheque/cash/LC only — no mobile wallets. Bounced cheque = criminal. Cairo truck ban 6AM-midnight. Arabic-Indic numerals + Arabic unit translations — no exceptions.

## Project

A B2B building materials logistics platform for Egypt. Quote-based RFQ model, no published prices, no online payments. Five apps (website, internal platform, portal, CEO app, driver app) sharing one Supabase backend on Cloudflare Workers. White-label per tenant.

**Core Value:** Contractors get quotes within 4 hours through an AI-powered platform that coordinates suppliers, deliveries, and payments behind a single branded experience.

**Known risks:** @supabase/ssr on Workers (test Phase 1), RHF watch() broken with React 19, TanStack AI/Hotkeys are 0.x (wrap behind abstractions), Vite 8 incompatible (stay on 7).

## Stack (Quick Reference — full details in STACK-DECISION.md)

TanStack Start ^1.167.12 | React ^19.2.4 | TypeScript ^6.0.2 | Vite ^7.3.1 (NOT 8)
Tailwind ^4.2.2 | React Aria ^1.16.0 | Motion ^12.38.0 | Zustand ^5.0.12
i18next ^26.0.1 | React Hook Form ^7.72.0 | Supabase | Cloudflare Workers + R2 + KV
Bun workspaces + Turborepo ^2.8.21 | Vitest ^4.1.2 | Playwright ^1.58.2 | Biome ^2.4.8

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow

Use `/gsd:quick` for small fixes, `/gsd:debug` for bugs, `/gsd:execute-phase` for planned work.
Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Not yet configured. Run `/gsd:profile-user` to generate.
<!-- GSD:profile-end -->
