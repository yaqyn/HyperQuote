# Support Email Implementation

Support tickets share a conversation model across the website contact form,
Portal tickets, and inbound email. This document describes the implementation;
provider credentials and account-specific activation state belong in Infisical
and private operator notes.

## Inbound Messages

- The Internal app exposes `POST /api/email/inbound/resend` for Resend
  `email.received` webhooks.
- The handler verifies Svix signatures using `RESEND_WEBHOOK_SECRET`, fetches
  message content using `RESEND_API_KEY`, validates the configured recipient,
  normalizes message fields, and deduplicates retries.
- The Internal Worker also exports an `email(message, env)` handler for
  Cloudflare Email Routing. It normalizes raw email and uses the same ingest logic.
- `support_email_threads` records provider IDs, message headers, ticket/message
  links, sender, recipients, and normalized subject.
- Writes pass through `service_ingest_support_email_message` and the underlying
  `ingest_support_email_message` RPC.

Thread matching tries message headers (`In-Reply-To` and `References`), then a
ticket reference in the subject, then the same sender and normalized subject on
a recent open or pending ticket. Otherwise, ingestion creates a new email-origin
ticket and links a matching customer when available.

Website and Portal ticket submissions retain their original source and enter
through `create_support_ticket`. Email replies may append to those conversations.

## Outbound Replies

Replies include the configured support Reply-To address, a ticket reference,
and threading headers when replying to an email-origin conversation. Provider
and thread metadata is recorded alongside the ticket history.

## Activation Requirements

Hosted email integration is pending verification for the revived portfolio.
Do not infer current provider or DNS state from historical acceptance records.

The intended production path uses Cloudflare Email Routing for the configured
support address and Resend for outbound messages. The Resend webhook endpoint
remains available for compatible inbound setups.

1. Verify the Internal Worker is deployed and its host is reachable.
2. Configure the provider credentials and support addresses in Infisical
   `/Projects/HyperQuote` `prod`; synchronize Worker secrets through the workflow.
3. Verify the provider's domain and outbound sender configuration.
4. Inventory root MX, existing mailbox routes, and catch-all behavior.
5. Enable support-only routing through the production configuration workflow.
6. Exercise inbound delivery, duplicate retries, conversation threading,
   outbound replies, and fail-closed behavior.

Root MX changes affect every mailbox on a domain. A whole-domain inbound
provider migration requires a separate decision and a plan for existing routes.

## Verification

Database and app checks should cover direct email ingestion, duplicate
webhooks, subject and header matching, unrelated subjects, recipient validation,
and signature verification. Historical proof is recorded in `Flow.evidence.md`;
current provider delivery needs a fresh end-to-end test.
