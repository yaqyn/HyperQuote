# HyperQuote Backend Contract

This is the implementation contract for replacing the mock app boundaries with
Supabase/Postgres while keeping Cloudflare Workers as the app runtime.

## Environments

- Local Supabase is the development and test backend.
- Hosted `hyperquote-staged` is the staging backend for staging Workers.
- Hosted `hyperquote-production` is the production backend for real data.
- Staged and production use the same migrations, RLS, storage policies,
  generated types, RPC contracts, and app code SHA.
- Staged apps must never point at production Supabase.
- Production apps must never point at staged Supabase.
- Infisical, GitHub, and Cloudflare secrets are environment-scoped. Master or
  operator credentials must never become app runtime, CI, deploy, or database
  credentials.

## Account Pools

- Website and Portal share the customer auth pool.
- Customer signup is phone-first, preferably WhatsApp OTP with SMS fallback.
- Email/password is a secondary customer sign-in path.
- Internal employees are company-created only.
- Drivers are company-created only.
- Suppliers do not have auth in v1. Supplier calls, prices, refill deals, and
  receiving issues are manually recorded by employees.
- Portal teams and customer organizations are deferred. V1 is one customer
  account owning its own drafts, orders, support tickets, and AI drafts.

## Data Groups

- Auth/profile: `profiles`, `customers`, `employees`, `drivers`, employee
  roles, and panel permissions.
- Catalog: categories, products, supplier links, daily price freshness, and
  price proof files.
- Orders: drafts, submitted orders, line snapshots, sales quote versions, and
  call notes.
- Inventory: stock on hand, reserved stock, computed available stock, and
  refill requests.
- Finance: customer payments, supplier payments, partial balances, and payment
  proof.
- Warehouse: loading tasks, receiving tasks, truck assignments, advisors, and
  inspections.
- Dispatch/Driver: deliveries, online state, driver locations, signatures, and
  delivery proof.
- Support: tickets, conversations, email/WhatsApp messages, and attachments.
- Audit/Search/AI: append-only activity events, CEO search views, and AI
  tool-call audit.

## Server Contracts

Critical transitions must run through Postgres RPCs or server-only transactional
functions:

- `claim_next_sales_order`
- `sales_save_and_requeue`
- `sales_approve_quote`
- `sales_reject_order`
- `create_manual_order`
- `request_price_update`
- `create_supplier_refill`
- `record_customer_payment`
- `record_supplier_payment`
- `reserve_order_stock`
- `warehouse_approve_loading`
- `warehouse_reject_loading`
- `warehouse_approve_receiving`
- `warehouse_reject_receiving`
- `dispatch_complete_delivery`
- `dispatch_reject_delivery`
- `driver_update_location`
- `driver_confirm_delivery`
- `driver_reject_delivery`
- `create_support_ticket`
- `send_support_reply`
- `ingest_whatsapp_message`

Every reject action requires proof. Reject RPCs must fail without proof.

## App Flows

- Website: browse market, build guest cart, auth on submit, resume cart, submit
  order, and create support tickets.
- Portal: save drafts, submit orders, view status, reorder, create support
  tickets, and use Portal AI to draft orders only after customer confirmation.
- Internal Sales: submitted orders are auto-claimed in order so two employees
  cannot take the same order.
- Internal Inventory: reserve stock only on fill; release on cancel or reject
  before delivery; consume only on delivery.
- Finance: customer IN and supplier OUT both support 50% and 100% payments with
  proof.
- Warehouse: loading sends customer deliveries to Dispatch; receiving increases
  inventory only after approval.
- Dispatch: map shows online drivers, assigned orders, live locations, and
  delivered/rejected outcomes.
- Driver: online GPS, assignment notification, accept, start, arrive, complete,
  signature proof, and reject with proof.
- Search: CEO-only views. Normal employees cannot query sensitive CEO data.

## AI Boundaries

- Website AI reads the public website index only.
- Portal AI reads customer-safe docs/products and the signed-in customer's own
  draft/order context.
- Employee AI follows employee role permissions and cannot access CEO-only data.
- Search AI is CEO-only and reads approved search views.
- AI can draft and summarize, but writes must go through explicit
  user-confirmed RPCs and audit events.

## Promotion Rule

Backend promotion is migration-first and SHA-pinned:

1. Apply and test migrations locally.
2. Generate database types from the same local schema.
3. Wire app adapters without changing caller contracts.
4. Smoke all four apps against local Supabase.
5. Apply the same migrations to `hyperquote-staged`.
6. Deploy staging apps for the same SHA.
7. Promote production only after staged smoke passes on that SHA.
