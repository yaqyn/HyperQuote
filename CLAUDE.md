# HyperQuote

Craftsmanship over speed. Built right once beats built fast twice. Phase 1 shortcuts become Phase 16 bugs.

B2B building materials platform for Egypt. 5 apps, spatial glass UI, Arabic-first.
Contractors submit once, receive consolidated multi-supplier quotes via AI coordination.

## Essential Files

IMPORTANT: You MUST read the relevant file before building — do not guess from memory.

| File | When to Read |
|------|-------------|
| `frontend-design` skill | Building any UI component (invoke via Skill tool — single source of truth for design) |
| `essential/brand/STACK-DECISION.md` | Before any new import or config |
| `essential/BACKEND.md` | Touching server/DB code |

## Stack

Use TanStack Start, not Next.js. Use React Aria, not shadcn. Use Motion v12, not framer-motion. Use Bun, not npm. Deploy to Cloudflare Workers, not Vercel. Stay on Vite 7 — Vite 8 is incompatible. Wrap 0.x libraries (TanStack AI, Hotkeys) behind abstractions.

IMPORTANT: Check `package.json` for current versions before adding or upgrading any dependency.

## Code Rules

- `useWatch()` never `watch()` — RHF watch() is broken with React 19
- `.inputValidator()` not `.validator()` for TanStack server functions
- CSS custom properties in `:root {}`, never `@theme`
- `ClientOnly` wrapper for maps and browser-only APIs
- `isKeyboardDismissDisabled` on all Dialogs
- Data fetching in TanStack Router loaders, never `useEffect`
- Server state in TanStack Query, never useState/Zustand
- UI-only state (open/closed, forms) in useState
- Cross-component client state (sidebar, theme) in Zustand
- Two Supabase clients: browser client for client code, server client for server code — never mix
- `getUser()` for auth checks, not `getSession()` — session can be tampered

## Build

Don't build after every single edit. Build periodically — after completing a full feature or when the user asks to check. Constant builds are disruptive.

## Quality

- Never drop a requirement because it's hard. If the user asked for it, it ships. If an approach fails, diagnose why and try a fundamentally different approach — never retry the same pattern, and never remove the feature and call it done.
- Learn from context. Before each attempt, review what already failed and why. Understand the root cause — then decide: fix the specific flaw, or pivot to a different approach. Never blindly repeat the same mistake, but don't abandon a sound approach over a fixable detail either.
- Never claim code works without running it. `bun test` or `bun run build` — verify, don't assume.
- Never generate placeholder/TODO code. Finish what you start or don't start it.
- No `any` types. No `as` casts unless truly unavoidable — add a comment explaining why.
- Every component handles three states: loading, error, empty. No blank screens.
- No dead code, unused imports, or commented-out blocks. Delete, don't comment.
- No `console.log` in committed code. Use structured logging or remove it.

## Frontend

- All text must be i18n keys — never hardcode English or Arabic strings in JSX.
- RTL-first: use logical properties (margin-inline-start, padding-inline-end), never left/right.
- All interactive elements must be keyboard accessible. React Aria handles this — don't override it.
- Images: always specify width/height or aspect-ratio to prevent layout shift. Use WebP/AVIF.
- Forms: validate on blur, not on change. Show errors inline next to the field, not in toasts.
- Animations: respect `prefers-reduced-motion`. Wrap all Motion usage in a check.
- Never use `dangerouslySetInnerHTML`. React's JSX escaping handles XSS — don't bypass it.
- Wrap route-level components in error boundaries. One crash must not white-screen the app.
- Brand colors: white, black, blue `#2563EB`. These are the only colors in the palette.

## Security

- Audit dependencies before adding. Pin exact versions for critical packages. Never auto-update without review.
- Never expose secrets, API keys, or connection strings in client-side code.
- All database queries through Supabase RLS — never bypass with service role key unless explicitly required.
- Never concatenate user input into SQL strings — not in `.rpc()` calls, not in migrations, nowhere.
- CORS: allowlist specific origins, never wildcard `*` in production.
- Rate limit all public-facing endpoints. Use Cloudflare Workers rate limiting or KV counters.
- File uploads: validate MIME type, enforce size limits, sanitize filenames. Store in R2, never local filesystem.
- Auth tokens: short-lived access tokens, httpOnly secure cookies. Never store tokens in localStorage.

## Backend

- Every server function has Zod input validation AND typed return. No untyped endpoints.
- Database migrations are idempotent — safe to run multiple times without side effects.
- All Supabase queries use `.select()` to specify columns — never `SELECT *`.
- Errors return structured responses `{ error: string, code: string }`, never raw stack traces.
- Long operations (PDF generation, email, AI) run async via Cloudflare Queues, never block the request.
- All monetary values stored as integers (smallest unit). Never use floating point for money.
- Timestamps in UTC. Convert to local timezone only at the display layer.

## Performance

- Lazy load routes and heavy components. Only the current route's code should ship to the client.
- TanStack Query: set `staleTime` per query type — never leave defaults. Cache aggressively for static data.
- Debounce search inputs (300ms minimum). Never fire a query on every keystroke.
- Virtualize long lists (100+ items). Never render 500 DOM nodes when 20 are visible.
- Bundle size: no barrel exports (`index.ts` re-exporting everything). Import from specific modules.
- Images: lazy load below-the-fold. Use `loading="lazy"` and `decoding="async"`.
- Cloudflare Workers: stay under 50ms CPU time. No synchronous loops over large datasets — paginate or stream.