# Support Email Handoff

This records the support-email threading work and provider setup that was done
before the hosted push/deploy session.

## Implemented In Repo

- Local commit: `6b2766d` (`Add support email threading`).
- Internal inbound endpoint: `POST /api/email/inbound/resend`.
- Internal Cloudflare Email Worker handler: `apps/internal/src/server.ts`
  exports `email(message, env)` and shares the same support-email ingest logic.
- Inbound provider: Resend `email.received` webhook with Svix signature
  verification using `RESEND_WEBHOOK_SECRET`.
- Production inbound provider: Cloudflare Email Routing sends only
  `support@hyperquote.net` to the Internal Worker; the Worker parses the raw
  message, normalizes sender, recipients, subject, body, and headers, rejects
  unsupported recipients, and dedupes retries.
- Inbound fetch: the handler fetches received email content from Resend using
  `RESEND_API_KEY`, normalizes sender, recipients, subject, body, and headers,
  rejects mail not addressed to `support@hyperquote.net`, and dedupes retries.
- Database threading:
  - `support_ticket_source` includes `email`.
  - `support_email_threads` stores provider id, internet message ids, ticket
    and message links, sender, recipients, and normalized subject.
  - `service_ingest_support_email_message` /
    `ingest_support_email_message` create or append support tickets.
- Thread matching order:
  1. `In-Reply-To` / `References` against known support email thread rows.
  2. Ticket reference in subject, for example `[TK-2026-ABC123]`.
  3. Same sender plus normalized subject on a recent open or pending ticket.
  4. Otherwise create a new `source=email` support ticket and link a customer
     by email when one exists.
- Outbound support replies include:
  - `Reply-To: support@hyperquote.net`.
  - Ticket reference in the subject.
  - `In-Reply-To` / `References` when replying to an email-originated thread.
  - Outbound provider/thread metadata in `support_email_threads`.
- Website contact form and Portal support tickets still use
  `create_support_ticket`. Their first message stays `website` or `portal`;
  customer email replies can append later through ticket references.

## External Provider State

As of 2026-05-25:

- Infisical `/Projects/HyperQuote` has:
  - `RESEND_API_KEY`
  - `RESEND_WEBHOOK_SECRET`
  - `SUPPORT_INBOUND_EMAIL=support@hyperquote.net`
- Resend has domain `hyperquote.net` created in `eu-west-1`.
- Resend domain capabilities returned by the API are sending and receiving
  enabled. Do not add Resend sending DNS for `hyperquote.net` unless outbound
  sending from that domain is intentionally reopened.
- Resend webhook is enabled for `email.received`:
  - Endpoint: `https://internal.hyperquote.net/api/email/inbound/resend`
  - Event: `email.received`
- Resend receiving MX requirement for root-domain delivery:
  - Name: `hyperquote.net`
  - Type: `MX`
  - Value: `inbound-smtp.eu-west-1.amazonaws.com`
  - Priority: `10`
- Cloudflare Email Routing is already enabled for `hyperquote.net` with root
  MX records:
  - `route1.mx.cloudflare.net`
  - `route2.mx.cloudflare.net`
  - `route3.mx.cloudflare.net`
- Existing Cloudflare Email Routing rules:
  - `hq@hyperquote.net` forwards to the existing Proton destination.
  - Catch-all is enabled and forwards to the existing Proton destination.
- The production workflow configures or updates a support-only Email Routing
  rule for `support@hyperquote.net` to the `hyperquote-internal` Worker without
  changing root MX or catch-all behavior.

## Production Activation

The selected path is Option B: preserve Cloudflare Email Routing and add
support-only routing. Production activation now depends on the production
workflow deploying `hyperquote-internal`, syncing its secrets, configuring the
Email Routing rule, and passing the live smoke checks.

The Resend inbound webhook route stays for compatibility. Do not replace root
MX with Resend receiving MX unless the whole `@hyperquote.net` inbound domain is
intentionally migrated away from Cloudflare Email Routing.

## Activation Options

### Option A: Use Resend Receiving For The Whole Domain

This matches the implemented `/api/email/inbound/resend` endpoint directly.

Required steps:

1. Deploy Internal so `https://internal.hyperquote.net` resolves and reaches
   the current Internal app.
2. Confirm the Internal runtime has `RESEND_API_KEY`,
   `RESEND_WEBHOOK_SECRET`, and
   `SUPPORT_INBOUND_EMAIL=support@hyperquote.net`.
3. Replace the root Cloudflare Email Routing MX records with the Resend
   receiving MX record.
4. Recreate any required non-support mailbox behavior in Resend or another mail
   routing layer before replacing MX, otherwise the current `hq@` route and
   catch-all delivery will change.
5. Ask Resend to verify the domain after DNS propagates.

Use this only if the whole `@hyperquote.net` inbound domain can be handled by
Resend.

### Option B: Preserve Cloudflare Email Routing And Add Support-Only Routing

This preserves the existing `hq@` route and catch-all, but it needs one more
implementation because the original inbound endpoint was Resend-specific.

Required steps:

1. Keep Cloudflare Email Routing MX records in place.
2. Add a Cloudflare Email Worker route for only `support@hyperquote.net`.
3. Reuse the same database ingest RPC after normalizing the raw email.
4. Enable the `support@hyperquote.net` Email Routing rule only after the
   Internal host is reachable.

This is now implemented by `scripts/configure-cloudflare-production.mjs` and the
Internal Worker email handler.

## Verification Already Run

- `bun run db:migrate`
- Local migration replay with `psql`
- `bun run db:types`
- Rollback-only database smoke for direct email, duplicate webhook, subject
  reference threading, header threading, and unrelated subject separation.
- `bun run db:api-boundary`
- `bun run test src/__tests__/customer-service-email.test.ts` in
  `apps/internal`
- `bun run typecheck` in `apps/internal`
- Root `bun run typecheck`
- `bun run check:ci`
- `git diff --check`
- Pre-commit `gitleaks`
